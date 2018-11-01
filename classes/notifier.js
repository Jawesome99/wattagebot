class Notifier {
	constructor(data) {
		this.id = data.id;
		this.notifyOnline = data.notifyOnline;
		this.notifyOffline = data.notifyOffline;
		return this;
    }
    
    toggleOnline() {
        if (this.notifyOnline) {
            this.notifyOnline = false;
            return 0;
        } else {
            this.notifyOnline = true;
            return 1;
        }
    }

    toggleOffline() {
        if (this.notifyOffline) {
            this.notifyOffline = false;
            return 0;
        } else {
            this.notifyOffline = true;
            return 1;
        }
    }
}

module.exports = Notifier;
