const { Client, GatewayIntentBits, Events } = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

const bot = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const validPasswords = ['Shadow#024'];
let authenticatedUsers = new Set();
let offlineMode = false;
let ipDatabase = {}; // Simulated local database

// Helper functions
const fetchLocationDetails = async (lat, lon) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await response.json();
    const streetName = data.address?.road || 'Street name not found';
    const postcode = data.address?.postcode || 'Postcode not found';
    return { streetName, postcode };
  } catch (error) {
    console.error('Error fetching location details:', error);
    return { streetName: 'Error fetching street name', postcode: 'Error fetching postcode' };
  }
};

const typeWriterEffect = async (message, text) => {
  for (let i = 0; i < text.length; i++) {
    process.stdout.write(text.charAt(i));
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  process.stdout.write('\n');
};

// Command handling
bot.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot) return;

  const [command, ...args] = msg.content.split(' ');

  if (command === '!login') {
    if (authenticatedUsers.has(msg.author.id)) {
      msg.reply('You are already logged in.');
      return;
    }

    const password = args[0];
    if (validPasswords.includes(password)) {
      authenticatedUsers.add(msg.author.id);
      msg.reply('Authentication successful! You can now use other commands.');
    } else {
      msg.reply('Incorrect password.');
    }
  }

  if (!authenticatedUsers.has(msg.author.id)) {
    msg.reply('Please authenticate first using `!login <password>`.');
    return;
  }

  if (command === '!toggleOfflineMode') {
    offlineMode = !offlineMode;
    msg.reply(offlineMode ? 'Offline mode activated.' : 'Offline mode deactivated.');
  }

  if (command === '!trackIP') {
    const name = args[0];
    const ip = args[1];

    if (!ip) {
      msg.reply('Please provide a valid IP address. Usage: `!trackIP <name> <ip>`');
      return;
    }

    if (offlineMode) {
      if (ipDatabase[ip]) {
        const data = ipDatabase[ip];
        msg.reply(`Offline Data:\nName: ${data.name}\nIP: ${ip}\nCity: ${data.city}\nRegion: ${data.region}\nCountry: ${data.country}`);
      } else {
        msg.reply('No data found for this IP in offline mode.');
      }
      return;
    }

    try {
      const response = await fetch(`http://ip-api.com/json/${ip}`);
      const data = await response.json();

      if (data.status === 'fail') {
        msg.reply('Failed to retrieve IP information.');
        return;
      }

      const locationDetails = await fetchLocationDetails(data.lat, data.lon);

      ipDatabase[ip] = {
        name,
        city: data.city,
        region: data.region,
        country: data.country,
        lat: data.lat,
        lon: data.lon,
        street: locationDetails.streetName,
        postcode: locationDetails.postcode,
      };

      msg.reply(`IP Information:\nName: ${name}\nIP: ${ip}\nCity: ${data.city}\nRegion: ${data.region}\nCountry: ${data.country}\nStreet: ${locationDetails.streetName}\nPostcode: ${locationDetails.postcode}`);
    } catch (error) {
      console.error('Error fetching IP information:', error);
      msg.reply('An error occurred while retrieving IP information.');
    }
  }
});

// Simulated "code rain" effect in the terminal
setInterval(() => {
  process.stdout.write('\x1b[32m' + Math.random().toString(36).substr(2, 1).toUpperCase() + '\x1b[0m');
}, 100);

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}`);
});

bot.login(process.env.DISCORD_TOKEN);
