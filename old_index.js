require("dotenv").config()
const Discord = require("discord.js");
const config = require('./config.json'); // has prefix
const db = require('quick.db')
const schedule = require("node-schedule")
const QuickChart = require('quickchart-js');
const client = new Discord.Client()
client.commands = new Discord.Collection()
client.aliases = new Discord.Collection()
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const { CanvasRenderService } = require("chartjs-node-canvas");


function removePeaks(data){
  return data.filter((x, index, array) => {

    if(array[index-1] - x < 20){ 
      //console.log(`Current x: ${x}`)
      //console.log(`Current index: ${index}`)
      //console.log(`Previous x: ${array[index-1]}`)
      return x
    }
  })
}

function removePeaks2(data){
  return data.filter((x, index, array) => {
    if(x - array[index-1] < 18){ 
      //console.log(x)
      return x
    }
  })
}


async function chart(Discord, sendMessage, type) {
  let storage_3s_mmr = new db.table('storage_3s_mmr')
  let storage_2s_mmr = new db.table('storage_2s_mmr')
  let storage_1s_mmr = new db.table('storage_1s_mmr')
  let morph, qt, mystic, jay, chris;
  if(type === '1s'){
     morph = storage_1s_mmr.get(`morphew_1s_mmr`).map(Number)
     qt = storage_1s_mmr.get(`quantum_1s_mmr`).map(Number)
     mystic = storage_1s_mmr.get(`mystic_1s_mmr`).map(Number)
     jay = storage_1s_mmr.get(`jay_1s_mmr`).map(Number)
     chris = storage_1s_mmr.get(`chris_1s_mmr`).map(Number)
  }
  if(type === '2s'){
    morph = storage_2s_mmr.get(`morphew_2s_mmr`).map(Number)
    qt = storage_2s_mmr.get(`quantum_2s_mmr`).map(Number)
    mystic = storage_2s_mmr.get(`mystic_2s_mmr`).map(Number)
    jay = storage_2s_mmr.get(`jay_2s_mmr`).map(Number)
    chris = storage_2s_mmr.get(`chris_2s_mmr`).map(Number)
 }
  if(type === '3s'){
     morph = storage_3s_mmr.get(`morphew_3s_mmr`).map(Number)//.slice(-1100).slice(200,300)
     qt = storage_3s_mmr.get(`quantum_3s_mmr`).map(Number)//.slice(-1100).slice(200,300)
     mystic = storage_3s_mmr.get(`mystic_3s_mmr`).map(Number)//.slice(-1100).slice(200,300)
     jay = storage_3s_mmr.get(`jay_3s_mmr`).map(Number)//.slice(-1100).slice(200,300)
     chris = storage_3s_mmr.get(`chris_3s_mmr`).map(Number)//.slice(-1100).slice(200,300)
  }

 
  let sort_morph = removePeaks(morph)
  sort_morph = removePeaks2(sort_morph)
  let sort_qt = removePeaks(qt)
  sort_qt = removePeaks2(sort_qt)
  let sort_mystic = removePeaks(mystic)
  sort_mystic = removePeaks2(sort_mystic)
  let sort_jay = removePeaks(jay)
  sort_jay = removePeaks2(sort_jay)
  let sort_chris = removePeaks(chris)
  sort_chris = removePeaks2(sort_chris)


  let length = sort_morph.length
  let xValue = []
  for(let i = 1; i < length + 1; i++){
    xValue.push(i)
  }
	let embed = new Discord.MessageEmbed();
	const width = 1200;
	const height = 800;
	var type = '';
	type = 'line';
	const canvasRenderService = new CanvasRenderService( width, height, (ChartJS) => { });
  let sortconfig = {
		type: type,
		data: { labels: xValue, datasets: [{ label: 'Chris', backgroundColor: 'white', data: sort_chris, borderColor: 'white', fill: 'false', pointRadius: 0 },{ label: 'Morphew', backgroundColor: 'red', data: sort_morph, borderColor: 'red', fill: 'false', pointRadius: 0 }, { label: 'Quantum', backgroundColor: 'green', data: sort_qt, borderColor: 'green', fill: 'false', pointRadius: 0 }, 
                                                                       { label: 'Mystic', data: sort_mystic, backgroundColor: 'blue', borderColor: 'blue', fill: 'false', pointRadius: 0 }, {label: 'Jay', backgroundColor: 'purple',  data: sort_jay, borderColor: 'purple', fill: 'false', pointRadius: 0 }] },
    options: {
    title: {
      display: true,
    },
    scales: {
      xAxes: [{
        ticks: {
          //min: 1000,
          //max: 2000,
          stepSize: 288
        }
      }],
      yAxis: [{
        ticks: {
          //min: 1000,
          //max: 2000,
          suggestedMin: 1000
          //stepSize: 20
        }
      }]
    }

  }
	}

  const image = await canvasRenderService.renderToBuffer(sortconfig);
  const attachment = new Discord.MessageAttachment(image, "image.png");
    return attachment
  
  
}

const getRawData = (URL) => {
  return fetch(URL)
    .then((response) => response.text())
    .then((data) => {
        return data;
    });
};

const getInfo = async (URL, select) => {
  const data = await getRawData(URL);
  const $ = cheerio.load(data);
  const cdata = $("body").text()
  cdata.split(' | ').forEach(x => {
      if(x.includes(select)){
        rank = x.split(': ').pop().split(' (')[0]
        mmr = x.split('(').pop().split(')')[0]           
      }
      
  })  
  return [rank, mmr]
  }



 
  
  
client.on("ready", async () => {
  client.user.setPresence({
    status: "online",
    activity: {
      name: "at /oCrypticRL",
      type: "STREAMING",
      url: "https://www.twitch.tv/oCrypticRL"
    }
})

async function update3sChart(chart) {
  let server = client.guilds.cache.get('880934477164064768')
  let channels = server.channels.cache.filter(c => c.name == 'rank-chart').array();

  for (let current of channels) {
    await current.messages.fetch({around: '897711685249417266', limit: 1}).then(msg => {
      const fetchedMsg = msg.first()
      fetchedMsg.delete()
      fetchedMsg.send(`**3s Updating Chart** | **Updated:** ${Date.now()}`, chart )
    })}
}
async function update1sChart(chart) {
  let server = client.guilds.cache.get('880934477164064768')
  let channels = server.channels.cache.filter(c => c.name == 'rank-chart').array();

  for (let current of channels) {
    await current.messages.fetch({around: '897714211860402206', limit: 1}).then(msg => {
      const fetchedMsg = msg.first()
      fetchedMsg.delete()
      fetchedMsg.send(`**1s Updating Chart** | **Updated:** ${Date.now()}`, chart)
    })}
}

async function name(){
  let storage_3s_mmr = new db.table('storage_3s_mmr')
  let storage_2s_mmr = new db.table('storage_2s_mmr')
  let storage_1s_mmr = new db.table('storage_1s_mmr')
  const morphew = "https://api.yannismate.de/rank/epic/RealMorphew";
  const mystic = "https://api.yannismate.de/rank/steam/76561198297191188";
  const quant = "https://api.yannismate.de/rank/epic/quantumtyrant";
  const jay = "https://api.yannismate.de/rank/epic/jaymill2015";
  const chris = "https://api.yannismate.de/rank/epic/ocryptic";

  let morph_bundle = await getInfo(morphew, '3v3')
  let quant_bundle = await getInfo(quant, '3v3')
  let mystic_bundle = await getInfo(mystic,'3v3')
  let jay_bundle = await getInfo(jay, '3v3')
  let chris_bundle = await getInfo(chris, '3v3')


          storage_3s_mmr.push(`morphew_3s_mmr`, morph_bundle[1])

          storage_3s_mmr.push(`quantum_3s_mmr`, quant_bundle[1])

          storage_3s_mmr.push(`mystic_3s_mmr`, mystic_bundle[1])

          storage_3s_mmr.push(`jay_3s_mmr`, jay_bundle[1])

          storage_3s_mmr.push(`chris_3s_mmr`, chris_bundle[1])
 
  
          morph_bundle = await getInfo(morphew, '2v2')
          quant_bundle = await getInfo(quant, '2v2')
          mystic_bundle = await getInfo(mystic,'2v2')
          jay_bundle = await getInfo(jay, '2v2')
          chris_bundle = await getInfo(chris, '2v2')
        
        
                  storage_2s_mmr.push(`morphew_2s_mmr`, morph_bundle[1])
        
                  storage_2s_mmr.push(`quantum_2s_mmr`, quant_bundle[1])
        
                  storage_2s_mmr.push(`mystic_2s_mmr`,mystic_bundle[1])
        
                  storage_2s_mmr.push(`jay_2s_mmr`, jay_bundle[1])
        
                  storage_2s_mmr.push(`chris_2s_mmr`, chris_bundle[1])
        

  morph_bundle = await getInfo(morphew, '1v1')
  quant_bundle = await getInfo(quant, '1v1')
  mystic_bundle = await getInfo(mystic,'1v1')
  jay_bundle = await getInfo(jay, '1v1')
  chris_bundle = await getInfo(chris, '1v1')


          storage_1s_mmr.push(`morphew_1s_mmr`, morph_bundle[1])

          storage_1s_mmr.push(`quantum_1s_mmr`, quant_bundle[1])

          storage_1s_mmr.push(`mystic_1s_mmr`, mystic_bundle[1])

          storage_1s_mmr.push(`jay_1s_mmr`, jay_bundle[1])

          storage_1s_mmr.push(`chris_1s_mmr`, chris_bundle[1])


}

async function getChart()
{
  let chart1 = await chart(Discord, false, '1s')
  let chart2 = await chart(Discord, false, '2s')
  let chart3 = await chart(Discord, false, '3s')
  return [chart1, chart2, chart3]
}
schedule.scheduleJob("*/5 * * * *", () => {

  let charts = getChart()

  name()
  //update3sChart(charts[1])
  //update1sChart(charts[0])

  });
    console.log(`Logged in as ${client.user.tag}!`)
  });



client.on("message", async message => {

  if(message.author.id !== 158624640887947264) return;

  let generate = async (message, select) => {
    const morphew = "https://api.yannismate.de/rank/epic/RealMorphew";
    const mystic = "https://api.yannismate.de/rank/steam/76561198297191188";
    const quant = "https://api.yannismate.de/rank/epic/quantumtyrant";
    const jay = "https://api.yannismate.de/rank/epic/jaymill2015";
    const chris = 'http://api.yannismate.de/rank/epic/oCryptic';
    let morph_bundle = await getInfo(morphew, select)
    let quant_bundle = await getInfo(quant, select)
    let mystic_bundle = await getInfo(mystic,select)
    let jay_bundle = await getInfo(jay, select)
    let chris_bundle = await getInfo(chris, select)

    let embed = new Discord.MessageEmbed()
    .setDescription(`**Morphew**\n> Rank: ${morph_bundle[0]}\n> **${morph_bundle[1]}**\n\n**Quantum**\n> Rank: ${quant_bundle[0]}\n>  **${quant_bundle[1]}**\n\n**Mystic**\n> Rank: ${mystic_bundle[0]}\n>  **${mystic_bundle[1]}**\n\n**JayMill**\n> Rank: ${jay_bundle[0]}\n>  **${jay_bundle[1]}**\n\n**👑 Chris**\n> Rank: ${chris_bundle[0]}\n> **${chris_bundle[1]}**`)
    .setThumbnail(message.guild.iconURL())

    if(select === '3v3'){
      embed.setColor('BLUE')
      embed.setTitle('3v3 Ranks')
    }
    if(select === '2v2'){
      embed.setColor('GREEN')
      embed.setTitle('2v2 Ranks')
    }
    if(select === '1v1'){
      embed.setColor('RED')
      embed.setTitle('1v1 Ranks')
    }

    message.channel.send(embed)

  }
 
  if(message.content.toLowerCase() === '!test'){
    let storage_3s_mmr = new db.table('storage_3s_mmr')
    let storage_2s_mmr = new db.table('storage_2s_mmr')
    let storage_1s_mmr = new db.table('storage_1s_mmr')
    let p = storage_3s_mmr.get(`morphew_3s_mmr`)

    message.channel.send(`total data per: ${p.length}`)
    console.log(p)
    message.channel.send(`per day: ${(12 * 24)}`)
    message.channel.send(`per 3days: ${(12 * 24) * 3}`)
    message.channel.send(`per 7days: ${(12 * 24) * 7}`)
    let qt = storage_3s_mmr.get(`quantum_3s_mmr`).map(Number)
    console.log(qt.slice(-50))
    //console.log(storage_3s_mmr.all())
    //console.log(storage_1s_mmr.all())
  }


  if(message.content.toLowerCase() === '!me'){
    let storage_3s_mmr = new db.table('storage_3s_mmr')
    let morph = storage_3s_mmr.get(`morphew_3s_mmr`).slice(-250).map(Number)//.map(x => x - 1000)
    let qt = storage_3s_mmr.get(`quantum_3s_mmr`).slice(-250).map(Number)//.map(x => x - 1000)
    let mystic = storage_3s_mmr.get(`mystic_3s_mmr`).slice(-250).map(Number)//.map(x => x - 1000)
    let jay = storage_3s_mmr.get(`jay_3s_mmr`).slice(-250).map(Number)//.map(x => x - 1000)
    let chris = storage_3s_mmr.get(`chris_3s_mmr`).slice(-250).map(Number)//.map(x => x - 1000)
    let sort_morph = removePeaks(morph)
    let sort_qt = removePeaks2(qt)
    sort_qt = removePeaks(sort_qt)
    let sort_mystic = removePeaks2(mystic)
    sort_mystic = removePeaks(sort_mystic)
    let sort_jay = removePeaks2(jay)
    sort_jay = removePeaks(sort_jay)
    let sort_chris = removePeaks2(chris)
    sort_chris = removePeaks(sort_chris)
    let length = morph.slice(-250).length
    let xValue = []
    for(let i = 1; i < length + 1; i++){
      xValue.push(i)
    }

    const chart = new QuickChart();
    chart.setConfig({
      type: 'line',
      data: { labels: xValue, datasets: [{ label: 'Morphew', backgroundColor: 'red', data: sort_morph, borderColor: 'red', fill: 'false', pointRadius: 0 }, { label: 'Quantum', backgroundColor: 'green', data: sort_qt, borderColor: 'green', fill: 'false', pointRadius: 0 }, 
                                                                       { label: 'Mystic', data: sort_mystic, backgroundColor: 'blue', borderColor: 'blue', fill: 'false', pointRadius: 0 }, {label: 'Jay', backgroundColor: 'purple',  data: sort_jay, borderColor: 'purple', fill: 'false', pointRadius: 0 },
                                                                       { label: 'Chris', backgroundColor: 'black', data: sort_chris, borderColor: 'black', fill: 'false', pointRadius: 0 }] },
      options: {
        title: {
          display: true,
          text: 'Last 20.8 hours'
        },
        scales: {
          xAxes: [{
            ticks: {
              min: 800,
              max: 3000,
              stepSize: 50
            }
          }],
          yAxis: [{
            ticks: {
              min: 800,
              max: 3000,
              suggestedMin: 1000
              //stepSize: 20
            }
          }]
        }

      }
    });
    const url = await chart.getShortUrl();
    message.channel.send(`${url}`);



  }

  if(message.content.toLowerCase() === '!start'){
    let players = ['Morphew', 'Quantum', 'Mystic', 'JayMill']
    let team = []
    team.push(players[Math.floor(Math.random()*players.length)]);
    players = players.filter(x => !team.includes(x))
    team.push(players[Math.floor(Math.random()*players.length)]);
    players = players.filter(x => !team.includes(x))
    team.push(players[Math.floor(Math.random()*players.length)]);
    players = players.filter(x => !team.includes(x))
    message.channel.send(`**Starting:**\n - ${team[0]}\n - ${team[1]}\n - ${team[2]}\n\n**Out:** ${players}`)
  }

  if(message.content.toLowerCase() === '!3s'){
    generate(message, '3v3')
  }

  if(message.content.toLowerCase() === '!2s'){
    generate(message, '2v2')
  }
  if(message.content.toLowerCase() === '!chart 3s'){
    message.channel.send('**3s mmr chart**',await chart(Discord, true, '3s'))
  }
  if(message.content.toLowerCase() === '!chart 2s'){
    message.channel.send('**2s mmr chart**',await chart(Discord, true, '2s'))
  }
  if(message.content.toLowerCase() === '!chart 1s'){
    message.channel.send('**1s mmr chart**',await chart(Discord, true, '1s'))
  }
  if(message.content.toLowerCase() === '!1s'){
    generate(message, '1v1')
  }
 
  if(message.content === '!a'){
    console.log('ssss')
    let personLink = 'http://api.yannismate.de/rank/epic/oCryptic';
    let gamemode = '3v3'
    let storage_3s_mmr = new db.table('storage_3s_mmr')
    let storage_2s_mmr = new db.table('storage_2s_mmr')
    let storage_1s_mmr = new db.table('storage_1s_mmr')
    let storage = storage_3s_mmr
    let person_bundle = await getInfo(personLink, gamemode)
    let morphewLength = storage.get(`morphew_3s_mmr`).length
    let lengthDiff = morphewLength - storage.get(`chris_3s_mmr`).length
    console.log(lengthDiff)
    let stableRank = '1275'
    let arr = []
    let arr2 = ['1285','1295','1305','1315','1325','1335','1345','1355','1365','1375','1385','1395','1405','1415','1425','1435']
   for(let i = 0; i <= morphewLength-16; i++){
    arr.unshift(stableRank)
    //storage.push(`chris_3s_mmr`, stableRank)
  }
  arr = arr.concat(arr2)
    //arr = arr.unshift(storage.get('chris_3s_mmr'))
    //storage.set(`chris_3s_mmr`, arr)
   console.log((storage.get('chris_3s_mmr')).slice(20))
  }


  if(message.content.toLowerCase() === '!addPerson'){
    console.log('ssss')
    let personLink = 'http://api.yannismate.de/rank/epic/oCryptic';
    let gamemode = '3v3'
    let storage_3s_mmr = new db.table('storage_3s_mmr')
    let storage_2s_mmr = new db.table('storage_2s_mmr')
    let storage_1s_mmr = new db.table('storage_1s_mmr')
    let storage = storage_3s_mmr
    let person_bundle = await getInfo(personLink, gamemode)
    console.log(storage.all())
    let morphewLength = storage.get(`morphew_1s_mmr`).length
    let lengthDiff = morphewLength - storage.get(`chris_1s_mmr`).length
    let stableRank = '1275'
    let arr = []
    console.log(lengthDiff)
    for(let i = 0; i <= lengthDiff; i++){
      arr.unshift(stableRank)
      //storage.push(`chris_3s_mmr`, stableRank)
    }
    arr.concat(storage.get('chris_3s_mmr'))
    storage.set(`chris_3s_mmr`, arr)
    console.log((storage.get('chris_3s_mmr')))
  }


  let prefix = config.prefix;

    let content = message.content.split(" ");
    let command = content[0].toLowerCase();
    let args = content.slice(1);
    let commandfile;
    if (command.startsWith(prefix)) {
      if(client.commands.has(command.slice(prefix.length)))
            commandfile = client.commands.get(command.slice(prefix.length))
       else if (client.aliases.has(command.slice(prefix.length))) 
            commandfile = client.commands.get(client.aliases.get(command.slice(prefix.length)))
      else return
      if (commandfile) return
    }
  });


client.login(process.env.BOT_TOKEN)

