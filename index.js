var Service, Characteristic;
const axios = require('axios');
module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-mclimate-smartplug", "MClimate-Melissa", MelissaAccessory);
}

function MelissaAccessory(log, config) {
    this.log = log;
    this.name = config["name"];
    this.melissaName = config["melissa_name"] || this.name; 
    this.binaryState = 0; 
    this.log("Starting a Melissa with name '" + this.melissaName + "'...");
}
MelissaAccessory.prototype.getServices = function() {
    var melissaService = new Service.Thermostat(this.name);
    melissaService.getCharacteristic(Characteristic.TargetTemperature).on('set', (value, callback) => {
        axios({
            method: 'get',
            url: 'https://developer-api.seemelissa.com/v1/controllers/GCXV6958POH3',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 9fa769435fccd8b29d2c21eeac2bf770112bfcd2'
            }
        }).then(function(response) {
            var controller = response.data.controller;
            var command_log = controller._relation.command_log;
            var state = command_log.state;
            var mode = command_log.mode;
            var fan = command_log.fan;
            axios({
                method: 'post',
                url: 'https://developer-api.seemelissa.com/v1/provider/send',
                data: {
                    "serial_number": "GCXV6958POH3",
                    "command": "send_ir_code",
                    "state": state,
                    "mode": mode,
                    "temp": value,
                    "fan": fan
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 9fa769435fccd8b29d2c21eeac2bf770112bfcd2'
                }
            }).then(function(response) {
                console.log("Set the Temperature on '%s' to %s", this.melissaName, value);
            })
        })
        // console.log('in set')
        // console.log(value);
        callback(null);
    }).on('get', (callback) => {
        axios({
            method: 'get',
            url: 'https://developer-api.seemelissa.com/v1/controllers/GCXV6958POH3',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 9fa769435fccd8b29d2c21eeac2bf770112bfcd2'
            }
        }).then(function(response) {
            var controller = response.data.controller;
            var command_log = controller._relation.command_log;
            var temp = command_log.temp;
            // console.log('in get ' + temp)
            callback(null, temp);
        })
    })
    melissaService.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('set', (value, callback) => {
        axios({
            method: 'get',
            url: 'https://developer-api.seemelissa.com/v1/controllers/GCXV6958POH3',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 9fa769435fccd8b29d2c21eeac2bf770112bfcd2'
            }
        }).then(function(response) {
            var controller = response.data.controller;
            var command_log = controller._relation.command_log;
            var state = command_log.state;
            var temp = command_log.temp;
            var fan = command_log.fan;
            var mode = command_log.mode;
            if (value == 0) {
                state = 0;
            } else {
                switch (value) {
                    case 3:
                        mode = 0;
                        break;
                    case 1:
                        mode = 2;
                        break;
                    case 2:
                        mode = 3;
                        break;
                    default:
                        mode = 0;
                }
                if (state == 1) {
                    //state = 2; // - idle
                    state = 1;
                } else if (state == 0) {
                    state = 1;
                }
            }
            axios({
                method: 'post',
                url: 'https://developer-api.seemelissa.com/v1/provider/send',
                data: {
                    "serial_number": "GCXV6958POH3",
                    "command": "send_ir_code",
                    "state": state,
                    "mode": mode,
                    "temp": temp,
                    "fan": fan
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 9fa769435fccd8b29d2c21eeac2bf770112bfcd2'
                }
            }).then(function(response) {
                console.log("Set the Temperature on '%s' to %s", this.melissaName, value);
            })
        })
        console.log('in set State')
        console.log(value);
        callback(null);
    }).on('get', (callback) => {
        axios({
            method: 'get',
            url: 'https://developer-api.seemelissa.com/v1/controllers/GCXV6958POH3',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 9fa769435fccd8b29d2c21eeac2bf770112bfcd2'
            }
        }).then(function(response) {
            var controller = response.data.controller;
            var command_log = controller._relation.command_log;
            var mode = command_log.mode;
            var state = command_log.state;
            var modeForCallback;
            if (state == 0) {
                modeForCallback = 0;
            } else {
                switch (mode) {
                    case 0:
                        modeForCallback = 3;
                        break;
                    case 2:
                        modeForCallback = 1;
                        break;
                    case 3:
                        modeForCallback = 2;
                        break;
                    default:
                        modeForCallback = 0;
                }
            }
            // console.log('in get ' + modeForCallback)
            callback(null, modeForCallback);
        })
    })
    return [melissaService];
}