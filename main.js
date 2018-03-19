const fs = require("fs");
const mcp = require("minecraft-pinger");
const Wattage = require("./classes/");
const Discord = require("discord.js");
const self = new Discord.Client();
const prefix = "/";

self.owners = ["211227683466641408","114165537566752770"]; // Emosewaj, Timber
self.wtLog = []; addToLog("Logging started");
const wtQuery = {host:'73.181.125.119',port:25565}

function init() {
	return new Promise((resolve,reject) => {
		try {
			self.addressBook = new Discord.Collection();
			let initGates = require("./gates.json");
			for (i = 0; i < initGates.length; i++) {
				self.addressBook.set(initGates[i].address, new Wattage.Stargate(initGates[i]));
			}
			resolve();
		} catch(err) {
			reject(err);
		}
	});
}

function saveAddressBook() {
	let saveGates = [];
	self.addressBook.forEach(Gate => {
		saveGates.push(Gate);
	});
	fs.writeFileSync("./gates.json",JSON.stringify(saveGates,"",1),"utf8");
}

function firstCharUpper(string) {
	return string.slice(0,1).toUpperCase()+string.slice(1);
}

function getUser(id) {
	if (self.users.has(id)) return `${self.users.get(id)}\n${self.users.get(id).tag}`
	return `Unknown user: <@${id}>\nID: ${id}`;
}

function checkServer() {
	mcp.ping(wtQuery.host,wtQuery.port,(e, res) => {
		if (e) throw e;
		let players = res.players.sample;
		players = parsePlayers(players);
		if (players != "") players = "\n**Players online:**\n"+players;
		let embed = new Discord.RichEmbed()
		.setTitle("Official Server Information")
		.setDescription(`"${res.description}"\nIP: \`${wtQuery.host}:${wtQuery.port}\``)
		.addField("Ping (EU):",`${res.ping} ms`)
		.addField("Players:",`${res.players.online}/${res.players.max}${players}`)
		.addField("Log:",self.wtLog.join("\n"))
		.setThumbnail(self.user.displayAvatarURL)
		.setFooter(`All times are CET • Today at ${getTime().slice(1,getTime().length-1)}`)
		.setColor("RED");
		self.channels.get("421798550083731467").fetchMessage("421818347445813269").then(m => {
			m.edit({embed});
		});
	});
	return setTimeout(() => checkServer(),60000);
}

function parsePlayers(players) {
	if (players == undefined) players = [];
	let playersMap = new Map();
	for (let i in players) {
		playersMap.set(players[i].id,players[i]);
	}
	if (!self.wtLastPlayers) {
		self.wtLastPlayers = new Discord.Collection();
		for (let i in players) {
			self.wtLastPlayers.set(players[i].id,players[i]);
		}
	}
	playersMap.forEach(p => {
		if (!self.wtLastPlayers.has(p.id)) {
			self.wtLastPlayers.set(p.id,p);
			addToLog(`:inbox_tray: ${p.name} joined the game.`);
		}
	});
	self.wtLastPlayers.forEach(p => {
		if (!playersMap.has(p.id)) {
			self.wtLastPlayers.delete(p.id);
			addToLog(`:outbox_tray: ${p.name} left the game.`);
		}
	});
	let returnString = "";
	for (let i in players) {
		returnString += players[i].name+"\n";
	}
	return returnString;
}

function addToLog(message) {
	if (self.wtLog.length = 15) self.wtLog.shift()
	return self.wtLog.push(`${getTime()} ${message}`);
}

function getTime() {
	let date = new Date();
	let hour = date.getHours().toString(); if(hour.length == 1){hour = ("0"+hour)}
	let minute = date.getMinutes().toString(); if(minute.length == 1){minute = ("0"+minute)}
	return (`[${hour}:${minute}]`);
}


self.on("ready", () => {
	self.user.setActivity("Wattage");
	checkServer();
});

self.on("message", m => {
	if (m.author == self.user || (m.channel.type != "text" && m.channel.type != "dm") || !m.content.startsWith(prefix)) return;
	
	let cmd = m.content.split(" ")[0].slice(prefix.length);
	let args = m.content.split(" ").slice(1);
	
	switch(cmd.toLowerCase()) {
		case "test": {
			return checkServer();
		}
		case "help": {
			return m.channel.send({
				embed: new Discord.RichEmbed().setAuthor("Commands",self.user.displayAvatarURL)
				.addField("/add","Add a Stargate to the addressbook.")
				.addField("/remove","Remove one of your Stargates")
				.addField("/list","List all public stargates.")
				.addField("/find","Find a specific stargate by name.")
				.addField("/changeOwner","Change the owner of a stargate.")
				.addField("/millenaire",`I'll be right there, ${m.author.username}!`)
				.setTimestamp()
			});
			break;
		}
		case "add": {
			let messages = [];
			let step = 0;
			m.channel.send("Please enter the name of the Stargate now or cancel to abort!");
			let col = m.channel.createMessageCollector(m1 => m1.author == m.author,{time: 180000});
			col.on("collect", m1 => {
				if (m1.content.toLowerCase() == "cancel") return col.stop("time");
				step++;
				switch(step) {
					case 1: {
						messages.push(m1.author.id);
						messages.push(m1.content);
						return m1.channel.send(`The Stargate's name will be \`${m1.content}\`! Please enter the address now!`);
					}
					case 2: {
						messages.push(m1.content.toUpperCase());
						return m1.channel.send(`The Stargate's address is \`${m1.content.toUpperCase()}\`! Please enter a description for your Stargate now.`);
					}
					case 3: {
						messages.push(m1.content);
						return m1.channel.send("Please enter your privacy setting now!\n\nPublic: Visible in the address book and findable with the find command.\nPrivate: Hidden from find and addressbook, but will be accessable otherhow.")
					}
					case 4: {
						if (m1.content.toLowerCase() == "public" || m1.content.toLowerCase() == "private") {
							messages.push(m1.content.toLowerCase());
							col.stop();
							return m1.channel.send(`Your Stargate will be ${m1.content.toLowerCase()}! Stargate will be registered now!`);
						}
						step--;
						return m1.channel.send("Error: Please enter either `cancel`, `public` or `private`!");
					}
				}
			});
			col.on("end",(collected, reason) => {
				if (reason == "time") return m.channel.send("Command cancelled.");
				self.addressBook.set(messages[2],new Wattage.Stargate({owner: messages[0], name: messages[1], description: messages[3], address: messages[2], privacy: messages[4]}));
				return saveAddressBook();
			});
			break;
		}
		case "remove": {
			let step = 0;
			let gateAddress;
			m.channel.send("Please enter the address or the name of the Stargate that should be removed!");
			let col = m.channel.createMessageCollector(m1 => m1.author == m.author,{time: 90000});
			col.on("collect", m1 => {
				if (m1.content.toLowerCase() == "cancel") return col.stop("time");
				step++;
				switch(step) {
					case 1: {
						let gate;
						if (self.addressBook.has(m1.content.toUpperCase())) {
							gate = self.addressBook.get(m1.content.toUpperCase());
						} else {
							gate = self.addressBook.find(gate => {
								if (gate.name.toLowerCase().includes(m1.content.toLowerCase())) return true;
							});
						}
						var gateName = m1.content;
						if (!gate) return col.stop("notFound");
						if (gate.owner != m1.author.id && !self.owners.includes(m1.author.id)) return col.stop("notOwner");
						gateAddress = gate.address;
						return m1.channel.send("Deleting this gate, confirm by typing `confirm`, abort with `cancel`!",{
							embed: new Discord.RichEmbed()
							.setTitle("Stargate")
							.setDescription(gate.description)
							.addField("Name:",gate.name,true)
							.addField("Address:",gate.address,true)
							.addField("Owner:",getUser(gate.owner),true)
							.addField("Privacy:",firstCharUpper(gate.privacy),true)
						});
					}
					case 2: {
						if (m1.content.toLowerCase() == "confirm") {
							col.stop();
							return m1.channel.send(`Stargate with address ${gateAddress} has been deleted!`);
						}
					}
				}
			});
			col.on("end",(collected, reason) => {
				if (reason == "time") return m.channel.send("Command cancelled.");
				if (reason == "notOwner") return m.channel.send("You are not the owner of this gate, you cannot delete it!");
				if (reason == "notFound") return m.channel.send(`No gate found with the name ${gateName}!`);
				self.addressBook.delete(gateAddress);
				return saveAddressBook();
			});
			break;
		}
		case "list": {
			let page = 1;
			if (args[0]) page = parseInt(args[0]);
			let range = [page*10-10, page*10] // [0] = begin, [1] = end
			let listGates = [];
			self.addressBook.forEach(gate => {
				if (gate.privacy == "public") listGates.push(gate);	
			});
			listGates = listGates.sort(sortBy("name",false,function(a){return a.toUpperCase()})).slice(range[0],range[1]);

			let length = 0;
			for(let i in listGates) {
				if (listGates[i].name.length > length) length = listGates[i].name.length;
			}

			let toSend = [];
			for(let i in listGates) {
				toSend.push(`${listGates[i].name}${" ".repeat(length-listGates[i].name.length)} \t ${listGates[i].address}`);
			}
			return m.channel.send("```\n"+toSend.join("\n")+"```");
		}
		case "find": {
			let gates = [];
			self.addressBook.forEach(gate => {
				if (gate.name.toLowerCase().includes(args.join(" ").toLowerCase()) && gate.privacy == "public") gates.push(gate);
			});
			gates.sort(sortBy("name",false,function(a){return a.toUpperCase()}));

			if (!gates[0]) return m.channel.send(`No Stargate with the name ${args.join()} found!`);
			let results = gates.length;	// save total amount of results for later
			if (gates.length > 15) gates = gates.slice(0,15);	// limit search results to 15 elements
			
			let length = 0;
			for (i in gates) {
				if (gates[i].name.length > length) length = gates[i].name.length;
			}

			let toSend = [];
			for (let i in gates) {
				toSend.push(`${gates[i].name}${" ".repeat(length-gates[i].name.length)}\t${gates[i].address}`);
			}
			if (results == 1) return m.channel.send("Found a stargate!",{
				embed: new Discord.RichEmbed()
				.setTitle("Stargate")
				.setDescription(gates[0].description)
				.addField("Name:",gates[0].name,true)
				.addField("Address:",gates[0].address,true)
				.addField("Owner:",getUser(gates[0].owner),true)
				.addField("Privacy:",firstCharUpper(gates[0].privacy),true)
			});
			if (results > 15) return m.channel.send("Found "+results+" results (15 shown)!\n```\n"+toSend.join("\n")+"\n```");
			return m.channel.send("Found "+results+" results!\n```\n"+toSend.join("\n")+"\n```");
		}
		case "changeowner": {
			let step = 0;
			m.channel.send("Please enter the name or the address of the Stargate!");
			let col = m.channel.createMessageCollector(m1 => m1.author == m.author,{time: 90000});
			let gate;
			col.on("collect", m1 => {
				if (m1.content.toLowerCase() == "cancel") return col.stop("time");
				step++;
				switch(step) {
					case 1: {
						if (self.addressBook.has(m1.content.toUpperCase())) {
							gate = self.addressBook.get(m1.content.toUpperCase());
						} else {
							gate = self.addressBook.find(gate => {
								if (gate.name.toLowerCase().includes(m1.content.toLowerCase())) return true;
							});
						}
						if (!gate) return col.stop("notFound");
						if (gate.owner != m1.author.id && !self.owners.includes(m1.author.id)) return col.stop("notOwner");
						gateAddress = gate.address;
						return m1.channel.send("Please tag the new owner of this stargate or type `cancel` to abort!",{
							embed: new Discord.RichEmbed()
							.setTitle("Stargate")
							.setDescription(gate.description)
							.addField("Name:",gate.name,true)
							.addField("Address:",gate.address,true)
							.addField("Owner:",getUser(gate.owner),true)
							.addField("Privacy:",firstCharUpper(gate.privacy),true)
						});
					}
					case 2: {
						if (!m1.mentions.users.first()) {step--; return m1.channel.send("You didn't tag a user! Try again!")}
						col.stop();
						let newOwner = m1.mentions.users.first();
						gate.owner = m1.mentions.users.first().id;
						self.addressBook.set(gate.address,gate);
						saveAddressBook();
						return m1.channel.send("Stargate owner changed!");
					}
				}
			});
			col.on("end",(collected, reason) => {
				if (reason == "time") return m.channel.send("Command cancelled.");
				if (reason == "notOwner") return m1.channel.send("You are not the owner of this gate, you cannot transfer ownership of it!");
				if (reason == "notFound") return m1.channel.send(`No gate found with name or address ${m1.content}!`);
			});
			break;
		}
		case "millenaire": {
			// hehe
			return m.channel.send(`I'll be right there, ${m.author.username}!\n`.repeat(8));
		}
	}
});

process.on("uncaughtException",e => {
	throw e;
});

init().then(() => self.login("Token"),err => {console.log(err);process.exit();});


/** Thanks Stackoverflow!
  * https://stackoverflow.com/questions/979256/sorting-an-array-of-javascript-objects
  * reverse = false -> 1,2,3,4,... but z,y,x,...!!
  */
function sortBy(field, reverse, primer){
	var key = primer ? 
		function(x) {return primer(x[field])} : 
		function(x) {return x[field]};

	reverse = !reverse ? 1 : -1;

	return function (a, b) {
       return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
    } 
}
