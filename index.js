#!/usr/bin/env node
/**
 * @fileOverview An example command line script.
 *
 * This outputs the number of bytes the content passed to it.
 */

const fetch = require('node-fetch');
const homeDir = require('homedir');
const path = require('path');
const fs = require('fs');
const entries = require('object.entries');

const encoding = 'utf-8';
const MINUTES_IN_MILISECONDS = 60000;

const configFilePath = path.resolve(homeDir(), '.time-log-poster.config.json');

const config = readConfig();

if (!Object.entries) {
  entries.shim(); //Object.entries for node e.g. 6.5
}

/**
 * Once we have data, carry out processing. In this case
 * that means writing the length of the input in bytes.
 */
function processData(data) {
  let jsonData = null;
  try {
    jsonData = JSON.parse(data.toString());
  } catch (e) {
    console.log(data.toString());
    console.log("Data is not a proper JSON");
    process.exit(1)
  }
  processEntries(jsonData);
}

/**
 * @param {{id: Number, note: String, start: String, end: String}[]} entries
 */
function processEntries(entries) {
  const noSSLTicketEntries = entries.filter(entry => !config.ticketRegex.test(entry.note));
  const entriesPerSSLTickets = groupEntriesPerSSLTicket(entries);

  //addTotalTime to entries
  const totalTimePerSSLTicket = Object.entries(entriesPerSSLTickets).reduce((prev, [ticket, entries]) => {
    prev[ticket] = sumMinutesOfEntriesDurations(entries);
    return prev;
  }, {});

  if (noSSLTicketEntries.length === 0 && totalTimePerSSLTicket.length === 0) {
    console.log('No time logged was found.')
  }
  if (noSSLTicketEntries.length > 0) {
    const ticketlessTime = minutesIntoJiraWorkloadFormat(sumMinutesOfEntriesDurations(noSSLTicketEntries));
    console.log('Time without without tickets: ', ticketlessTime);
  }
  if (Object.keys(totalTimePerSSLTicket).length > 0) {
    console.log('Posting time per ticket:');
    Object.entries(totalTimePerSSLTicket).forEach(([ticket, timeInMinutes]) => {
      const time = minutesIntoJiraWorkloadFormat(timeInMinutes);
      const entries = entriesPerSSLTickets[ticket];
      const startTime = dateToJiraFormat(new Date(entries[entries.length - 1].end));
      logTimeIntoJira(ticket, time, startTime);
    });
  } else {
    console.logs('There are no logs with Jira issue tickets');
  }
}

/**
 * @param {string} ticketId
 * @param {string} timeSpent
 * @param {string} started
 */
function logTimeIntoJira(ticketId, timeSpent, started) {
  console.log(`Posting ${ticketId} : ${timeSpent} at date ${started} started...`);
  return fetch(config.jiraUrl + `/rest/api/2/issue/${ticketId}/worklog`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: config.authorizationToken
    },
    body: JSON.stringify({
      timeSpent: `${timeSpent}`,
      started: '2017-09-07T09:21:41.000+0000'
    })
  }).then(response => {
    if (response.status > 299) {
      return response.text().then(responseText => Promise.reject(`${response.status} ${response.statusText}\n${responseText}`));
    }
  }).then(() => {
    console.log(`Success posting ${ticketId} : ${timeSpent}`);
  }).catch(e => {
    console.log(`Failure posting ${ticketId} : ${timeSpent}`);
    console.log(e);
  })
}

/**
 * @param {{id: Number, note: String, start: String, end: String}[]} entries
 * @return {Number} number of minutes
 */
function sumMinutesOfEntriesDurations(entries) {
  return entries.reduce((prev, entry) => {
    const start = Date.parse(entry.start);
    const end = Date.parse(entry.end);
    prev += (end - start) / MINUTES_IN_MILISECONDS;
    return prev;
  }, 0);
}

/**
 * @param {{id: Number, note: String, start: String, end: String}[]} entries
 */
function groupEntriesPerSSLTicket(entries){
  return entries.reduce((prev, entry) => {
    const matchResult = config.ticketRegex.exec(entry.note);
    if (matchResult === null) {
      return prev;
    }
    const ticket = matchResult[0];
    prev[ticket] = [entry, ...(prev[ticket] || [])];
    return prev;
  }, {});
}

/**
 * @param {Number} totalMinutes
 * @return {string}
 */
function minutesIntoJiraWorkloadFormat(totalMinutes) {
  const modMinutes = parseInt(totalMinutes % 60);
  const hours = parseInt(totalMinutes / 60);
  const result = (hours) ? `${hours}h ` : '' + `${modMinutes}m`;
  return result.trim();
}

/**
 * @param {Date} date
 * @return {string}
 */
function dateToJiraFormat(date){
  return date.toISOString().replace('Z','+0000');
}

/**
 * @return {{ticketRegex: RegExp, jiraUrl: string, authorizationToken: string}}
 */
function readConfig() {
  if (!fs.existsSync(configFilePath)) {
    console.error(`Couldn't read configuration file at: ${configFilePath}`);
    process.exit(1);
  }

  let file;
  try {
    file = JSON.parse(fs.readFileSync(configFilePath));
  } catch (e) {
    console.error(`Coudn't parse file at ${configFilePath}`);
    console.error(e);
  }
  try {
    file.ticketRegex = new RegExp(file.ticketRegex);
  } catch (e) {
    console.error(`Coudn't parse regex pattern at 'ticketRegex' of config file at ${configFilePath}`);
  }
  return file;
}

// ------------------------------------------------------------
// Called with arguments. E.g.:
// ./example-script "pass in this string as input"
// ------------------------------------------------------------
//if (process.stdin.isTTY) { //??NOT WORKING IN INTELLIJ DEBUG MODE?
if (true) {
  // Even though executed by name, the first argument is still "node",
  // the second the script name. The third is the string we want.
  const data = new Buffer(process.argv[2] || '', encoding);
  processData(data);
}

// ------------------------------------------------------------
// Accepting piped content. E.g.:
// echo "pass in this string as input" | ./example-script
// ------------------------------------------------------------
else {
  let data = '';
  process.stdin.setEncoding(encoding);

  process.stdin.on('readable', function() {
    var chunk;
    while (chunk = process.stdin.read()) {
      data += chunk;
    }
  });

  process.stdin.on('end', function() {
    // There will be a trailing \n from the user hitting enter. Get rid of it.
    data = data.replace(/\n$/, '');
    processData(data);
  });
}