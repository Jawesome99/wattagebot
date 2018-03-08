class Stargate {
	constructor(data) {
		this.owner = data.owner;
		this.name = data.name;
		this.description = data.description;
		this.address = data.address;
		this.privacy = data.privacy;
		return this;
	}
}

module.exports = Stargate;
