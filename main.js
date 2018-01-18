const fs = require("fs");
const Wattage = require("./classes/");
const Discord = require("discord.js");
const self = new Discord.Client();
const prefix = "/";

self.owners = ["",""];

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
	fs.writeFile("./gates.json",JSON.stringify(saveGates),"utf8");
}

self.on("ready", () => {
	self.user.setGame("Wattage");
});

self.on("message", m => {
	if (m.author == self.user || m.channel.type != "group" || !m.content.startsWith(prefix)) return;
	
	let cmd = m.content.split(" ")[0].slice(prefix.length);
	let args = m.content.split(" ").slice(1);
	
	switch(cmd.toLowerCase()) {
		case "add": {
			let messages = [];
			let step = 0;
			m.channel.send("Please enter the name of the Stargate now or cancel to abort!");
			let col = m.channel.createMessageCollector(m1 => m1.author == m.author,{time: 180});
			col.on("collect", m1 => {
				if (m1.content.toLowerCase() == "cancel") return col.stop("time");
				step++;
				switch(step) {
					case 1: {
						messages.push(m.author.id);
						messages.push(m.content);
						return m1.channel.send(`The Stargate's name will be \`${m1.content}\`! Please enter the address now!`);
					}
					case 2: {
						messages.push(m.content.toUpperCase());
						return m1.channel.send(`The Stargate's address is \`${m1.content.toUpperCase()}\`! Please enter your privacy setting now!\n\nPublic: Visible in the Addressbook and findable with the find command.\nPrivate: Hidden from find and addressbook, but will be accessable otherhow.`);
					}
					case 3: {
						if (m1.content.toLowerCase() == "public" || m1.content.toLowerCase() == "private") {
							messages.push(m.content.toLowerCase());
							return m1.channel.send(`Your Stargate will be ${m1.content.toLowerCase()}! Stargate will be registered now!`);
						}
						step--;
						return m1.channel.send("Error: Please enter either `cancel`, `public` or `private`!");
					}
				}
			});
			col.on("end",(collected, reason) => {
				if (reason == "time") return m.channel.send("Command cancelled.");
				self.addressBook.set(messages[2],new Wattage.Stargate({name: messages[1], address: messages[2], privacy: messages[3], owner = messages[0]});
				return saveAddressBook();
			});
		}
		case "remove": {
			let step = 0;
			let gateAddress;
			m.channel.send("Please enter the address or the name of the Stargate that should be removed!");
			let col = m.channel.createMessageCollector(m1 => m1.author == m.author,{time: 90});
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
						gateAddress = gate.address;
						return m1.channel.send("Deleting this gate, confirm by typing `confirm`, abort with `cancel`!",{
							embed: new Discord.RichEmbed().setTitle("Stargate").addField("Name:",gate.name,true).addField("Address:",gate.address,true).addField("Owner:",self.users.get(gate.owner),true).addField("Privacy:",gate.privacy,true)
						});
					}
					case 2: {
						if (m.content.toLowerCase() == "confirm") {
							self.addressBook.delete(gateAddress);
							return m1.channel.send(`Stargate with address ${gateAddress} has been deleted!`);
						}
					}
				}
			});
			col.on("end",(collected, reason) => {
				if (reason == "time") return m.channel.send("Command cancelled.");
			});
		}
		case "list": {
			// replace with the shit you have at home
			break;
		}
		case "find": {
			let gates = [];
			self.addressBook.forEach(gate => {
				if (gate.name.toLowerCase().includes(args.join(" ").toLowerCase())) gates.push(gate);
			});
			gates.sort(sortBy("name",false,function(a){return a.toUpperCase()}));

			if (!gates[0]) return m.channel.send(`No Stargate with the name ${args.join} found!`);
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
			if (results > 15) return m.channel.send("Found "+results+" results (15 shown)!\n```\n"+toSend.join("\n")+"\n```");
			return m.channel.send("Found "+results+" results!\n```\n"+toSend.join("\n")+"\n```");
		}
	}
});

init().then(() => self.login("Token"),err => {console.error(err);process.exit();});


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