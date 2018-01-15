class Stargate {
	constructor(data) {
		this.address = data.address;
		this.name = data.name;
		this.owner = data.owner;
		this.privacy = data.privacy;
		return this;
	}
}

module.exports = Stargate;