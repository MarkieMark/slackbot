'use strict';

const RtmClient = require('@slack/client').RtmClient;

const MemoryDataStore = require('@slack/client').MemoryDataStore;

const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

const fs = require('fs');

const token = fs.readFileSync('token', 'utf8').replace(/\s/g, '');

console.log(`token is ${token}`);

let slack = new RtmClient(token, {
    logLevel: 'error', //'debug',
    dataStore: new MemoryDataStore(),
    autoReconnect: true,
    autoMark: true
});

slack.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
    // console.log(slack);
    let user = slack.dataStore.getUserById(slack.activeUserId);
    let team = slack.dataStore.getTeamById(slack.activeTeamId);
    console.log(`connected to ${team.name} as ${user.name}`);
    let channels = getChannels(slack.dataStore.channels);
    let channelNames = channels.map((channel) => {
        return channel.name;
    }).join(", ");
    console.log(`currently in ${channelNames}`);
    channels.forEach((channel) => {
        let members = channel.members.map((id) => {
            return slack.dataStore.getUserById(id);
        });
        members = members.filter((member) => {
            return !member.is_bot;
        });
        let memberNames = members.map((member) => {
            return member.name;
        }).join(", ");
        console.log(`${channel.name} channel; members ${memberNames}`);
        // slack.sendMessage(`Hello ${memberNames}!`, channel.id);
    });
});

slack.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

slack.on(RTM_EVENTS.MESSAGE, (message) => {
    console.log(message)
    let user = slack.dataStore.getUserById(message.user);
    if (user && user.is_bot) {
        return;
    }
    let channel = slack.dataStore.getChannelGroupOrDMById(message.channel);
    if (message.text) {
        let msg = message.text.toLowerCase();
        if (/(hello|hi) (nodebot|mcnodebot)/g.test(msg)) {
            slack.sendMessage(`Hi, ${user.name}!`, channel.id);
        }
        if (/(nodebot|mcnodebot) uptime/g.test(msg)) {
            if (!user.is_admin) {
                slack.sendMessage(`Sorry ${user.name}, that functionality is only for admins.`, channel.id);
                return;
            }
            let dm = slack.dataStore.getDMByName(user.name);
            let uptime = process.uptime();
            let minutes = parseInt(uptime / 60, 10), hours = parseInt(minutes / 60, 10),
                    seconds = parseInt(uptime - (minutes * 60) - ((hours * 60) * 60), 10);
            slack.sendMessage(`I have been running for: ${hours} hours, ${minutes} minutes and ${seconds} seconds.`, dm.id);
        }
    }
});

function getChannels(allChannels) {
    let channels = [];
    for (let channelId in allChannels) {
        let channel = allChannels[channelId];
        if (channel.is_member) {
            channels.push(channel)
        }
    }
    return channels;
}
slack.start();
