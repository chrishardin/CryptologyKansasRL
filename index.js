require("dotenv").config()
const Discord = require("discord.js");
const config = require('./config.json'); // has prefix
const db = require('quick.db')
const schedule = require("node-schedule")
const QuickChart = require('quickchart-js');
const client = new Discord.Client()
client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()

const { CanvasRenderService } = require("chartjs-node-canvas");
const info = require("./info.json");
const functions = require("./functions.js")
const rank_emojis = require("./rank_emojis.json");

client.on("ready", async () => {
    client.user.setPresence({
        status: "online",
        activity: {
            name: "at /oCrypticRL",
            type: "STREAMING",
            url: "https://www.twitch.tv/oCrypticRL"
        }
    })
    schedule.scheduleJob("*/5 * * * *", () => {

        functions.doStuff(client);
        functions.updateTodayGamers(client)

    });
    schedule.scheduleJob("0 1 * * *", () => {

        functions.resetTodayGamers();

    });

    console.log(`Logged in as ${client.user.tag}!`)
});

    /* COMMANDS
     * if command === !1s !2s !3s defaults to your teams mmr page
     * !1s v, jv, club to see other team mmr page
     * !chart 3s 2s 1s defaults to your teams mmr page
     * !chart 3s v jv club to see other team chart
     * !1s all !2s all !3s all !chart 3s all etc, to see everyone at once
     * !me shows only that person, 1s 2s 3s all in 1 chart
     */

    
client.on("message", async message => {
    let now = message.content.toLowerCase();

    if(now === "!s" && message.author.id === "158624640887947264")
    {
        //functions.updateTodayGamers(client)
    }

    if(now.startsWith("!find"))
    {
        let arg = now.split(" ")
        let player = arg[1]
        let platform = arg[2]
        let types = ['steam', 'epic']
        if(player && platform)
        {
            if(!types.includes(platform)) return message.channel.send('use either `steam` or `epic`')
            let url = `https://api.yannismate.de/rank/${platform}/${player}`
            let ranks = await functions.getInfo(url)
            let desc = ''

            for(mode in ranks)
            {
                let rankNoDiv = ranks[mode].rank.split(' Div')[0]
                desc += `${mode}: ${rank_emojis[rankNoDiv]} **${ranks[mode].mmr}**\n`
            }
            let embed = new Discord.MessageEmbed()
            embed.setColor('#bfff9e')
            embed.setTitle(`${player} ranks`)
            embed.setDescription(desc)

            message.channel.send(embed)

        }
        else if(player)
        {
            let url = `https://api.yannismate.de/rank/steam/${player}`
            let ranks = await functions.getInfo(url)
            let desc = ''
            for(mode in ranks)
            {
                let rankNoDiv = ranks[mode].rank.split(' Div')[0]
                desc += `${mode}: ${rank_emojis[rankNoDiv]} **${ranks[mode].mmr}**\n`
            }
            let embed = new Discord.MessageEmbed()
            embed.setColor('#bfff9e')
            embed.setTitle(`${player} ranks`)
            embed.setDescription(desc)

            message.channel.send(embed)
        }
        else
        {
            message.channel.send('command: `!find <name> <platform>`, platform: steam (default), epic')
        }
        
    }

    if(now === "!reset-today" && message.author.id === "158624640887947264")
    {
        functions.resetTodayGamers();
         functions.updateTodayGamers(client);
    }

    if(now === "!update-today" && message.author.id === "158624640887947264")
    {
         functions.updateTodayGamers(client);
    }

    if(now === "!seedata" && message.author.id === "158624640887947264")
    {
        functions.seeData();
    }
    if(now === "!resetdata" && message.author.id === "158624640887947264")
    {
        functions.deleteData();
    }

    if(now === "!all")
    {
        let player = info[message.author.id];
        let arg_type = 'all';

        message.channel.send(`**${arg_type} 3s mmr chart**`,await functions.generateChart(player, Discord, '3s', arg_type))
        message.channel.send(`**${arg_type} 2s mmr chart**`,await functions.generateChart(player, Discord, '2s', arg_type))
        message.channel.send(`**${arg_type} 1s mmr chart**`,await functions.generateChart(player, Discord, '1s', arg_type))
    }

    if(now.startsWith("!3s"))
    {
        types = ["v", "jv", "club", "all"];
        let player = info[message.author.id];
        let arg = now.split("!3s ")[1]
        if(arg && types.includes(arg))
        {
            functions.generatePlayerMMRs(message, player, "3s",arg);
        }
        else
        {
            functions.generatePlayerMMRs(message, player, "3s");
        }
    }
    if(now.startsWith("!2s"))
    {
        types = ["v", "jv", "club", "all"];
        let player = info[message.author.id];
        let arg = now.split("!2s ")[1]
        if(arg && types.includes(arg))
        {
            functions.generatePlayerMMRs(message, player, "2s",arg);
        }
        else
        {
            functions.generatePlayerMMRs(message, player, "2s");
        }
    }
    if(now.startsWith("!1s"))
    {
        types = ["v", "jv", "club", "all"];
        let player = info[message.author.id];
        let arg = now.split("!1s ")[1]
        if(arg && types.includes(arg))
        {
            functions.generatePlayerMMRs(message, player, "1s",arg);
        }
        else
        {
            functions.generatePlayerMMRs(message, player, "1s");
        }
    }

    if(now.startsWith("!chart"))
    {
        let player = info[message.author.id];
        types = ["v", "jv", "club", "all"];
        let arg = now.split("!chart ")[1]

        if(arg && arg.startsWith("3s"))
        {
            let arg_type = arg.split("3s ")[1]
            if(arg_type && types.includes(arg_type))
            {
                message.channel.send(`**${arg_type} 3s mmr chart**`,await functions.generateChart(player, Discord, '3s', arg_type))
            }
            else
            {
                message.channel.send(`**${player[0]} 3s mmr chart**`,await functions.generateChart(player, Discord, '3s'))
            }
        }
        else if(arg && arg.startsWith("2s"))
        {
            let arg_type = arg.split("2s ")[1]
            if(arg_type && types.includes(arg_type))
            {
                message.channel.send(`**${arg_type} 2s mmr chart**`,await functions.generateChart(player, Discord, '2s', arg_type))
            }
            else
            {
                message.channel.send(`**${player[0]} 2s mmr chart**`,await functions.generateChart(player, Discord, '2s'))
            }
        }
        else if(arg && arg.startsWith("1s"))
        {
            let arg_type = arg.split("1s ")[1]
            if(arg_type && types.includes(arg_type))
            {
                message.channel.send(`**${arg_type} 1s mmr chart**`,await functions.generateChart(player, Discord, '1s', arg_type))
            }
            else
            {
                message.channel.send(`**${player[0]} 1s mmr chart**`,await functions.generateChart(player, Discord, '1s'))
            }
        }
        else
        {
            message.channel.send("choose a rank you bot `<1s, 2s, 3s>`")
        }
    }

    if(now === "!me")
    {
        let player = info[message.author.id];
        message.channel.send(`**${player[1]} personal mmr chart**`,await functions.generatePersonalChart(player, Discord))
    }

    let prefix = config.prefix;

    let content = message.content.split(" ");
    let command = content[0].toLowerCase();
    let args = content.slice(1);
    let commandfile;
    if (command.startsWith(prefix)) {
        if (client.commands.has(command.slice(prefix.length)))
            commandfile = client.commands.get(command.slice(prefix.length))
        else if (client.aliases.has(command.slice(prefix.length)))
            commandfile = client.commands.get(client.aliases.get(command.slice(prefix.length)))
        else return
        if (commandfile) return
    }
});

client.login(process.env.BOT_TOKEN)