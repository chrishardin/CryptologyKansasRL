const Discord = require("discord.js");
const db = require('quick.db')
const QuickChart = require('quickchart-js');
const { CanvasRenderService } = require("chartjs-node-canvas");
const info = require("./info.json");
const rank_emojis = require("./rank_emojis.json");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const fs = require('fs')
const { createCanvas, loadImage } = require('canvas')

// gets raw data from rl api
module.exports.getRawData = (URL) => {
    return fetch(URL)
        .then((response) => response.text())
        .then((data) => {
            return data;
        });
};

// URL = url  :: gets info for mmr from RL api
module.exports.getInfo = async (URL) => {
    let ranks = 
    {
        "3s" : { "rank": "", "mmr": ""},
        "2s" : { "rank":"", "mmr": ""},
        "1s" : { "rank":"", "mmr": ""},
    }

    const data = await this.getRawData(URL);
    const $ = cheerio.load(data);
    const cdata = $("body").text()
    cdata.split(' | ').forEach(x => {
        if (x.includes("3v3")) {
            ranks['3s'].rank = x.split(': ').pop().split(' (')[0]
            ranks['3s'].mmr = x.split('(').pop().split(')')[0]
        }
    })
    cdata.split(' | ').forEach(x => {
        if (x.includes("2v2")) {
            ranks['2s'].rank = x.split(': ').pop().split(' (')[0]
            ranks['2s'].mmr = x.split('(').pop().split(')')[0]
        }
    })
    cdata.split(' | ').forEach(x => {
        if (x.includes("1v1")) {
            ranks['1s'].rank = x.split(': ').pop().split(' (')[0]
            ranks['1s'].mmr = x.split('(').pop().split(')')[0]
        }
    })

    return ranks
}

// every 24 hours, reset mmr_table.today_gamers for #todays-gamers
module.exports.resetTodayGamers = async () => {
    let mmr_table = new db.table('spring2022')
    let modes = ['3s', '2s', '1s']

    modes.forEach(mode => {
        mmr_table.set(`today_gamers.${mode}`, [])
    })

    for(player in info)
    {
        let player_data = info[player]
        let name = player_data[1]
        let userId = player_data[3]

        modes.forEach(mode => {
            let last_entry = mmr_table.get(`${userId}.${mode}`).pop()
            mmr_table.push(`today_gamers.${mode}`,{"name": name, "userId": userId, "games_played": 0, "start": last_entry, "last_change": last_entry, "keep": false} )
        })
    }

}

// every 5 minutes, update #todays-gamers
module.exports.updateTodayGamers = async (client) => {
    let mmr_table = new db.table('spring2022')
    let modes = ['3s', '2s', '1s'];
    let desc = {"3s": '', "2s": '', "1s": ''};
    
    let embed3= new Discord.MessageEmbed();
    let embed2= new Discord.MessageEmbed();
    let embed1= new Discord.MessageEmbed();
    modes.forEach(async mode => {
            let start = mmr_table.get(`today_gamers.${mode}`)

            start.forEach((x, index) => {
                let last_entry = mmr_table.get(`${x.userId}.${mode}`).pop()
                
                // if this is the first change
                if(!x.keep && x.last_change !== last_entry)
                {
                    x.last_change = last_entry;
                    x.games_played++;
                    x.keep = true;

                    desc[mode] += `**${x.name}**: \n> Games played: **${x.games_played}**\n> **${x.start}** => **${last_entry}**\n> mmr changed: **${last_entry - x.start}**\n\n`
                    mmr_table.set(`today_gamers.${mode}[${index}]`, x)
                }
                // if this isnt the first change
                else if(x.last_change !== last_entry)
                {
                    x.last_change = last_entry;
                    x.games_played++;

                    desc[mode]  += `**${x.name}**: \n> Games played: **${x.games_played}**\n> **${x.start}** => **${last_entry}**\n> mmr changed: **${last_entry - x.start}**\n\n`
                    mmr_table.set(`today_gamers.${mode}[${index}]`, x)
                }
                // there is no update, but they played today
                else if(x.keep)
                {
                    desc[mode]  += `**${x.name}**: \n> Games played: **${x.games_played}**\n> **${x.start}** => **${last_entry}**\n> mmr changed: **${last_entry - x.start}**\n\n`
                }

                if(desc[mode] === '')
                {
                    desc[mode] = '*someone play a game..*'
                }
        })

        if(mode === "3s")
        {
            embed3.setDescription(desc[mode])
            embed3.setColor('BLUE')
            embed3.setTitle('3s Team Progression')
        }
        if(mode === '2s')
        {
            embed2.setDescription(desc[mode])
            embed2.setColor('GREEN')
            embed2.setTitle('2s Team Progression')
        }
        if(mode === '1s')
        {
            embed1.setDescription(desc[mode])
            embed1.setColor('RED')
            embed1.setTitle('1s Team Progression')
        }
    })
    

    let server = client.guilds.cache.get('880934477164064768')
    let channels = server.channels.cache.filter(c => c.name == 'todays-gamers').array();
    for (let current of channels) {
        await current.messages.fetch({limit: 3}).then(msg => {
        for(let a_message of msg.array())
        {
            a_message.delete()
        }
        })

        desc = {"3s": '', "2s": '', "1s": ''};   
        current.send(embed3);
        current.send(embed2);
        current.send(embed1);
    }
    
}

// if mmr_table stops getting data, use this to repopulate off of spades length
module.exports.fixDataMissing = async (client, modess) => {
    let mmr_table = new db.table('spring2022');
    let _1 = [];
    let _2 = [];
    let _3 = [];
    for(player in info)
    {
        let player_data = info[player]
        let url = player_data[2]
        let userId = player_data[3]

        let userRanks = await this.getInfo(url)

            for(mode in userRanks)
            {
                if(mode === '3s')
                    {
                        _3.push({"name": player_data[1] ,"color": player_data[4],"userId": userId, "url": url ,"mmr_data": mmr_table.get(`${userId}.${mode}`)})
                    }
                    if(mode === '2s')
                    {
                        _2.push({"name": player_data[1] ,"color": player_data[4],"userId": userId, "url": url ,"mmr_data": mmr_table.get(`${userId}.${mode}`)})
                    }
                    if(mode === '1s')
                    {
                        _1.push({"name": player_data[1] ,"color": player_data[4],"userId": userId, "url": url ,"mmr_data": mmr_table.get(`${userId}.${mode}`)})
                    }
            }
    }
    let spade3 =0 ;

    let using;
    if(modess === '3s')
    {
            using = _3;
    }
    if(modess === '2s')
    {
        using = _2;
    }
    if(modess === '1s')
    {
        using = _1;
    }
    for(let i = 0; i < using.length; i++)
    {
        if(using[i].name === 'Spade')
        {
            spade3 = using[i].mmr_data.length;
        }
        else
        {
            let diff = spade3 - using[i].mmr_data.length
            console.log(using[i].name, diff) 
            for(let j = 0; j < diff; j++)
            {
                let url = using[i].url
                let id = using[i].userId
                let userRanks = await this.getInfo(url)
    
                await this.savemmr(userRanks, id, modess)
            }
            console.log(using[i].name, 'done') 
            

        }
        
    }
    
}

// if mmr_table.user.mmr has '', use this to replace with previous
module.exports.fixDataBlank = async (client) => {
    let mmr_table = new db.table('spring2022');
    for(player in info)
    {
        let player_data = info[player]
        let url = player_data[2]
        let userId = player_data[3]

        let userRanks = await this.getInfo(url)

            for(mode in userRanks)
            {
                let mmrs = mmr_table.get(`${userId}.${mode}`)
                for(let i = 0; i < mmrs.length; i++)
                {
                    if(mmrs[i] === '')
                    {
                        console.log(player_data[1], mode, i)
                        
                        mmrs[i] = mmrs[i-1] 
                    }
                }
                mmr_table.set(`${userId}.${mode}`, mmrs)               
            }
    }
}

// basic function to test commands
module.exports.testStuff = async (client) => {
    let mmr_table = new db.table('spring2022');

    for(player in info)
    {
        let player_data = info[player]
        let url = player_data[2]
        let userId = player_data[3]

        let userRanks = await this.getInfo(url)

            for(mode in userRanks)
            {
                //let last_entry = mmr_table.get(`${userId}.${mode}`).pop()
               // let diff = userRanks[mode].mmr - last_entry

                // if its bad data, dont save it
                //if(!(diff > 35) && !(diff < -35))
                {
                    await this.savemmr(userRanks, userId, mode)

                    if(mode === '3s')
                    {
                        await this.updateRoles(client, userRanks[mode], player);
                    }
                }
                
            }
    }
}

// helper method to do busy work for saving mmr
module.exports.doStuff = async (client) => {
    let mmr_table = new db.table('spring2022');

    for(player in info)
    {
        let player_data = info[player]
        let url = player_data[2]
        let userId = player_data[3]

        let userRanks = await this.getInfo(url)

            for(mode in userRanks)
            {
                //let last_entry = mmr_table.get(`${userId}.${mode}`).pop()
               // let diff = userRanks[mode].mmr - last_entry

                // if its bad data, dont save it
                //if(!(diff > 35) && !(diff < -35))
                {
                    await this.savemmr(userRanks, userId, mode)

                    if(mode === '3s')
                    {
                        await this.updateRoles(client, userRanks[mode], player);
                    }
                }
                
            }
    }
}

// saves mmr for players in mmr_table
module.exports.savemmr = async (userRanks, userId, mode) => {
    let mmr_table = new db.table('spring2022');

    let last_entry = mmr_table.get(`${userId}.${mode}`).pop()
    
    if(userRanks[mode].mmr === '')
    {
        mmr_table.push(`${userId}.${mode}`, last_entry)
    }
    else
    {
        mmr_table.push(`${userId}.${mode}`, userRanks[mode].mmr)
    }
}

// makes embeds for !3s !2s !1s
function embedMaker(desc, mode, team){
    let varsity_color = "#e74c3c"
    let jv_color = "#e67e22"
    let club_color = "#f1c40f"

    let embed = new Discord.MessageEmbed()
        .setDescription(desc)
        let title = "";
        
        if(team === "varsity")
        {
            embed.setColor(varsity_color)
            title +="Varisty "
        }
        if(team === "junior varsity")
        {
            embed.setColor(jv_color)
            title += "JV "
        }
        if(team === "club")
        {
            embed.setColor(club_color)
           title += "Club "
        }
        if(team === "all")
        {
            embed.setColor("BLUE")
           title += "All "
        }
        if(mode === '3s'){
            title += "3v3 Ranks"
            embed.setTitle(title)
            embed.setThumbnail("https://cdn.discordapp.com/attachments/880945291451306004/932801927216001134/dice_3-512.png")
          }
          if(mode === '2s'){
            title += '2v2 Ranks'
            embed.setTitle(title)
            embed.setThumbnail("https://cdn.discordapp.com/attachments/880945291451306004/932801853358473296/dice_2-512.png")
          }
          if(mode === '1s'){
            title += '1v1 Ranks'
            embed.setTitle(title)
            embed.setThumbnail("https://cdn.discordapp.com/attachments/880945291451306004/932801890675195904/dice_1-512.png")
          }
    return embed;
}


function getHeight(context, text){
    return context.measureText(text).actualBoundingBoxAscent + context.measureText(text).actualBoundingBoxDescent
}
  function getWidth(context, text){
    return context.measureText(text).width
}

module.exports.canvasGenerator = async (message, desc, mode, team, userRanks) => {

    const colors = {"white": "#fff", "dark_gray": "#1f2124", "light_gray": "#2f3136", "text": "#acaeb2", "mmr_text": "#dcdcdd",
                    0: 'red', 1: 'orange', 2: 'yellow', 3: 'green', 4: 'blue'}

    const width = 400
    const height = 250
    let start_width = 0
    let start_height = 0
    const size = userRanks.length
    const paddingUp = 5
    const paddingDown = 10
    const paddingSide = 10
    const rectHeight = (height / size) - paddingDown
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
  
    // dark gray background
    context.fillStyle = colors['dark_gray']
    context.fillRect(start_width, start_height, width, height)

    start_width = 5
    start_height = 5
    console.log(`current: (${start_width}, ${start_height})`)
    // header
    let header = `${team} ${mode}`
    context.font = 'bold 16px sans-serif'
    context.textAlign = 'left'
    context.textBaseline = 'top'
    context.fillStyle = colors['dark_gray']
    context.fillText(header, start_width,start_height)
    header_height = getHeight(context, header)

    context.fillStyle = colors['light_gray']
    context.fillRect(start_width, start_height, width-paddingSide, header_height+7)

    header = `${team} ${mode}`
    context.font = 'bold 16px sans-serif'
    context.textAlign = 'left'
    context.textBaseline = 'top'
    context.fillStyle = colors['text']
    context.fillText(header, start_width+7,start_height)

    // cards
    //console.log(height/size)
    //console.log(rectHeight)
    console.log(`max: (${width}, ${height})`)

    start_height = header_height + 7
    console.log(`current: (${start_width}, ${start_height})`)
    console.log(`start_height+(0*rectHeight) = ${start_height+(0*rectHeight)}`)
    console.log(`start_height+(1*rectHeight) = ${start_height+(1*rectHeight)}`)
    console.log(`start_height+(2*rectHeight) = ${start_height+(2*rectHeight)}`)
    console.log(`start_height+(3*rectHeight) = ${start_height+(3*rectHeight)}`)
    console.log(`start_height+(4*rectHeight) = ${start_height+(4*rectHeight)}`)
    for(let i = 0; i < size; i++)
    {

        context.fillStyle = colors[i]
        context.globalAlpha = 0.4;
        context.fillRect(start_width, start_height+(i*rectHeight) + paddingDown, width-paddingSide, start_height+((i)*rectHeight)+ 5)
        console.log(`(${start_width}, ${start_height+(i*rectHeight) + paddingDown}) -> (${width-paddingSide}, ${start_height+((i)*rectHeight)+ 5})`)
        
            header = `${i} (${start_width}, ${start_height+(i*rectHeight)+paddingDown})`
        context.font = 'bold 8px sans-serif'
        context.textAlign = 'left'
        context.textBaseline = 'top'
        context.fillStyle = colors['text']
        context.fillText(header, start_width,start_height+(i*rectHeight)+paddingDown)
  
        

    }

    

    

  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync('./rank.png', buffer)
  const attachment = new Discord.MessageAttachment(buffer, './rank.png')
  if(message.author.id === '158624640887947264')
  {
    return message.channel.send(attachment)
  }
  
  
}


// for commands !3s !2s !1s
module.exports.generatePlayerMMRs = async (message, player, mode, type = "") => {
        
        let players = info;
        let team = type === "" ? player[0] : (type === "v" ? "varsity" : (type === "jv" ? "junior varsity" : (type === "club" ? "club" : "all")));
        
        if(team !== "all")
        {
            const asArray = Object.entries(info);
            const filtered = asArray.filter(([key, value]) => value[0] === team);
            players = Object.fromEntries(filtered);
        }

        let userRanks = []
        for(player in players)
        {
            let data = players[player];
            userRanks.push({"name": data[1] ,"ranks": await this.getInfo(data[2])})
        }

        let desc = "";
        userRanks.forEach(x => {
            for(gamemode in x.ranks)
            {
                if(mode === gamemode)
                {
                    let rankNoDiv = x.ranks[gamemode].rank.split(' Div')[0]
                    desc += `**${x.name}**\n> ${rank_emojis[rankNoDiv]} ${x.ranks[gamemode].rank}\n> **${x.ranks[gamemode].mmr}**\n\n`
                }
            }
        })
        
        let embed = embedMaker(desc, mode, team)
        this.canvasGenerator(message, desc, mode, team, userRanks)
        message.channel.send(embed)

}

// adding ranks to chart (dotted lines)
function fillRankGuidelines(length, mode)
{
    let ssl= [];    let gc3 = [];    let gc2 = [];    let gc1 = [];

    let mmr = {"ssl": { "3s": 1875, "2s": 1875, "1s": 1355 }, "gc3": {"3s": 1715, "2s": 1715, "1s": 1294}, 
                        "gc2": {"3s": 1575, "2s": 1575, "1s": 1227}, "gc1": {"3s": 1435, "2s": 1435, "1s": 1167}}


    for(let i = 1; i < length + 1; i++){
        ssl.push(mmr["ssl"][mode])
        gc3.push(mmr["gc3"][mode])
        gc2.push(mmr["gc2"][mode])
        gc1.push(mmr["gc1"][mode])

      }
      return [ssl, gc3, gc2, gc1]
}

// for command !chart
module.exports.generateChart = async (player, Discord, mode, type = "") => {
    let mmr_table = new db.table('spring2022');

    let players = info;
    let team = type === "" ? player[0] : (type === "v" ? "varsity" : (type === "jv" ? "junior varsity" : (type === "club" ? "club" : "all")));
    
    if(team !== "all")
    {
        const asArray = Object.entries(info);
        const filtered = asArray.filter(([key, value]) => value[0] === team);
        players = Object.fromEntries(filtered);
    }

    let userRanks = []
    for(player in players)
    {
        let data = players[player];
        userRanks.push({"name": data[1] ,"color": data[4] ,"mmr_data": mmr_table.get(`${data[3]}.${mode}`)})
    }


    let length = userRanks[0].mmr_data.length
    let xValue = []
    for(let i = 1; i < length + 1; i++){
      xValue.push(i)
    }
    let ranks = fillRankGuidelines(length, mode);

      const width = 1200;
      const height = 800;

      const canvasRenderService = new CanvasRenderService( width, height, (ChartJS) => { });
    let sortconfig = {
          type: 'line',
          data: { labels: xValue, datasets: [] },
      options: { title: {display: true,},
      scales: {
        xAxes: [{ ticks: {stepSize: 288}}],
        yAxis: [{ticks: {suggestedMin: 1000}}] 
        }}}

    userRanks.forEach(x => {
        //console.log(`${x.name}, ${x.color}`)
        sortconfig.data.datasets.push({label: x.name, backgroundColor: x.color, data: x.mmr_data, borderColor: x.color, fill: 'false', pointRadius: 0 })
    })
    if(team === 'varsity')
    {
        sortconfig.data.datasets.push({label: 'SSL', backgroundColor: 'white', data: ranks[0], borderColor: 'white', fill: 'false', pointRadius: 0,borderDash: [5, 5] })
        sortconfig.data.datasets.push({label: 'GC3', backgroundColor: 'purple', data: ranks[1], borderColor: 'purple', fill: 'false', pointRadius: 0,borderDash: [5, 5] })
        sortconfig.data.datasets.push({label: 'GC2', backgroundColor: 'purple', data: ranks[2], borderColor: 'purple', fill: 'false', pointRadius: 0,borderDash: [5, 5] })
    }
    if(team === 'junior varsity')
    {
        sortconfig.data.datasets.push({label: 'GC1', backgroundColor: 'purple', data: ranks[3], borderColor: 'purple', fill: 'false', pointRadius: 0, borderDash: [5, 5] })
    }
    

    const image = await canvasRenderService.renderToBuffer(sortconfig);
    const attachment = new Discord.MessageAttachment(image, "image.png");
      return attachment



}

// for command !me
module.exports.generatePersonalChart = async (player, Discord) => {
    let mmr_table = new db.table('spring2022');

    let userRanks = {"name": player[1], "3s": mmr_table.get(`${player[3]}.3s`), "2s": mmr_table.get(`${player[3]}.2s`), "1s": mmr_table.get(`${player[3]}.1s`)}

    let length = userRanks["3s"].length
    let xValue = []
    for(let i = 1; i < length + 1; i++){
      xValue.push(i)
    }

      const width = 1200;
      const height = 800;
      var type = '';
      type = 'line';

      const canvasRenderService = new CanvasRenderService( width, height, (ChartJS) => { });
    let sortconfig = {
          type: type,
          data: { labels: xValue, datasets: [{label: '3s', backgroundColor: 'red', data: userRanks["3s"], borderColor: 'red', fill: 'false', pointRadius: 0 },
                                            {label: '2s', backgroundColor: 'green', data: userRanks["2s"], borderColor: 'green', fill: 'false', pointRadius: 0 },
                                            {label: '1s', backgroundColor: 'blue', data: userRanks["1s"], borderColor: 'blue', fill: 'false', pointRadius: 0 }] },
      options: { title: {display: true,},
      scales: {
        xAxes: [{ ticks: {stepSize: 288}}],
        yAxis: [{ticks: {suggestedMin: 1000}}] 
        }}}


  
    const image = await canvasRenderService.renderToBuffer(sortconfig);
    const attachment = new Discord.MessageAttachment(image, "image.png");
      return attachment
}

// checks mmr for roles
function checkMMR(lowBound, highBound, mmr)
{
    let retVal = false; 
    if(mmr >= lowBound && mmr < highBound)
    {
        retVal = true;
    }
    return retVal;
}

// gives discord user the role for their 3s mmr
function giveRoleMMR(client, userId, roleToKeep)
{   
    let roles = ['933433520167206943', '933434132460081243', '933434242476687420', '933434283253719161', '933434369014648893', '933434434261246043', '933434487168192614']
    let guild = client.guilds.cache.get('880934477164064768');

    guild.members.fetch().then(fetchedMembers => {
        let user = fetchedMembers.filter(member => member.user.id === userId).get(userId);

        if(user)
        {
            // If they have the role they need, let them keep it. If not, remove all others
            roles.forEach(roleId => {
                let foundRole = user.guild.roles.cache.find(role => role.id === roleId);
                let userHasFoundRole = user.roles.cache.some(role => role.id === roleId);

                if(foundRole && userHasFoundRole)
                {
                    let roleTheyWant = user.guild.roles.cache.find(role => role.id === roleToKeep);
                    //console.log(`user has role: ${userHasFoundRole}`)
                    //console.log(`role they should have: ${roleTheyWant.name}`)
                    if(roleToKeep !== roleId)
                    {
                        user.roles.remove(foundRole);
                        console.log(`removed: ${foundRole.name}`)
                        var embed = new Discord.MessageEmbed().setTitle('🔻 Demoted').setDescription(`**${user}** has demoted from ${foundRole}!`)
                        guild.channels.cache.get('880937243232055326').send(embed)
                    }
                }
            })

            const role = guild.roles.cache.find((r) => r.id === roleToKeep);
            let userHasRoleToKeep = user.roles.cache.some(role => role.id === roleToKeep);
            if(!userHasRoleToKeep)
            {
                user.roles.add(role)
                console.log(`added: ${role.name}`)
                var embed = new Discord.MessageEmbed().setTitle('🎉 Promoted').setDescription(`**${user}** has promoted to ${role}`)
                guild.channels.cache.get('880937243232055326').send(embed)
            }
        }   
    });
}

// update role for discord user
module.exports.updateRoles = async (client, userRanks, userId) => {
    let mmr = userRanks.mmr;
    let rank = userRanks.rank;

    if(mmr > 1000)
    {
        if(checkMMR(1875, 4000, mmr)) return giveRoleMMR(client, userId, '933433520167206943'); // SSL
        else if(checkMMR(1715, 1875, mmr)) return giveRoleMMR(client, userId, '933434132460081243'); // GC3
        else if(checkMMR(1575, 1715, mmr)) return giveRoleMMR(client, userId, '933434242476687420'); // GC2
        else if(checkMMR(1435, 1575, mmr)) return giveRoleMMR(client, userId, '933434283253719161'); // GC1
        else if(checkMMR(1300, 1435, mmr)) return giveRoleMMR(client, userId, '933434369014648893'); // C3
        else if(checkMMR(1200, 1300, mmr)) return giveRoleMMR(client, userId, '933434434261246043'); // C2
        else if(checkMMR(1100, 1200, mmr)) return giveRoleMMR(client, userId, '933434487168192614'); // C1

    }

}

// delete all data
module.exports.deleteData = () => {
    let mmr_table = new db.table("spring2022");

    mmr_table.all().forEach(i => {mmr_table.delete(i.ID)})

}

// view data
module.exports.seeData = () => {
    let mmr_table = new db.table("spring2022");

    //mmr_table.all().forEach(i => {if(i.ID === '313187560367325200') { i.data['1s'].forEach(x => console.log(x))}})

    //mmr_table.all().forEach(i => console.log(i))

}

// Took emex out for the time being. Below is his entry into info.json. Change him from orange.
//  "447575627399299072": [ "varsity", "Emex", "https://api.yannismate.de/rank/epic/e-mex_1",447575627399299072, "orange" ],