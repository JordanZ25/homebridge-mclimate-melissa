var Service, Characteristic;
const axios = require('axios');
var localStorage = require('localStorage')
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
    this.serial_number = config['serial_number'];
    this.access_token = config['access_token'];
    this.refresh_token = config['refresh_token'];
    localStorage.setItem("refresh_token", config['refresh_token']);
    axios.interceptors.response.use(undefined, err => {
        const originalRequest = err.config;
        console.log('interceptors')
        console.log(err.response.status);
        if (err.response.status === 401 && !originalRequest._retry) {
            console.log(this.refresh_token)
           return axios({
                method: 'post',
                url: 'https://developer-api.seemelissa.com/v1/auth/renew',
                data: {
                    "client_id": "5c068a81ab1b0",
                    "client_secret": "5c068a81ab109",
                    "refresh_token": this.refresh_token
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                console.log(response)
                this.access_token = response.data.auth.access_token;
                axios.defaults.headers.common['Authorization'] = `Bearer ${this.access_token}`
                originalRequest.headers['Authorization'] = `Bearer ${this.access_token}`
                originalRequest._retry = true;
                return axios(originalRequest);
            }).catch((error)=>{
                console.log('here')
                console.log(error)
                // return Promise.reject(error);
            })
        }
    })
}
MelissaAccessory.prototype.getServices = function() {
    var melissaService = new Service.Thermostat(this.name);
    melissaService.getCharacteristic(Characteristic.CurrentTemperature).on('get', (callback) => {
        var self = this;
        axios({
            method: 'post',
            url: 'https://developer-api.seemelissa.com/v1/provider/fetch',
            data: {
                "serial_number": this.serial_number
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.access_token
            }
        }).then(function(response) {
            var temp = response.data.provider.temp;
            callback(null, temp)
        })
    })
    melissaService.getCharacteristic(Characteristic.TargetTemperature).on('set', (value, callback) => {
        var self = this;
        console.log(this.serial_number)
        console.log(this.access_token)
        axios({
            method: 'get',
            url: 'https://developer-api.seemelissa.com/v1/controllers/' + self.serial_number,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + self.access_token
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
                    "serial_number": self.serial_number,
                    "command": "send_ir_code",
                    "state": state,
                    "mode": mode,
                    "temp": value,
                    "fan": fan
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + self.access_token
                }
            }).then(function(response) {
                console.log("Set the Temperature on '%s' to %s", self.melissaName, value);
            })
        })
        callback(null);
    }).on('get', (callback) => {
        axios({
            method: 'get',
            url: 'https://developer-api.seemelissa.com/v1/controllers/' + this.serial_number,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.access_token
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
        var self = this;
        axios({
            method: 'get',
            url: 'https://developer-api.seemelissa.com/v1/controllers/' + this.serial_number,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.access_token
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
                    "serial_number": self.serial_number,
                    "command": "send_ir_code",
                    "state": state,
                    "mode": mode,
                    "temp": temp,
                    "fan": fan
                },
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + self.access_token
                }
            }).then(function(response) {
                console.log("Set the mode on '%s' to %s", self.melissaName, value);
            })
        })
        console.log('in set State')
        console.log(value);
        callback(null);
    }).on('get', (callback) => {
        axios({
            method: 'get',
            url: 'https://developer-api.seemelissa.com/v1/controllers/' + this.serial_number,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.access_token
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
            callback(null, modeForCallback);
        })
    })
    return [melissaService];
}