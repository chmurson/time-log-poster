## Motivation

Have you ever felt tired keeping track on your working time for each task and logging it in Jira?
`time-log-poster` connects Jira with simple and power tool for loging time via CLI -[Timetrap - Simple Time Tracking](https://github.com/samg/timetrap). 
It creates for you worklog entries in every jira task that correspond to Timestrap's entry.

### How to use it ?

Let's say we have following entries during a day:
```bash
t display -s  "Sep 07" -e "Sep 07"
```
outputs:
```                                                                                                                              
Timesheet: SSLPortal
    Day                Start      End        Duration   Notes
    Thu Sep 07, 2017   10:20:00 - 10:50:00   0:30:00
                       10:50:00 - 11:21:41   0:31:41    SSLP-1774-webpack-update
                       11:22:11 - 11:44:00   0:21:49    SSLP-1842
                       11:44:00 - 12:34:48   0:50:48    SSLP-1842
                       12:34:49 - 15:40:00   3:05:11    SSLP-1774-webpack-update
                       16:40:00 - 18:40:08   2:00:08    SSLP-1774-webpack-update
                                             7:19:37
    ----------------------------------------------------------------------------
    Total                                    7:19:37
```
Take a notice, that some entries have notes with Jira issue id (e.g. SSLP-1842). They are used by `time-log-poster` to find a jira tasks and create appropriate worklog entries.


Single line command moves above data into Jira,
```bash
t display -s  "Sep 07" -e "Sep 07" -fjson | time-log-poster
```
outputs:
```bash
Time without without tickets:  30m
Posting time per ticket:
Posting of 5h to SSLP-1774 on Thu Sep 07 2017 started...
Posting of 1h to SSLP-1842 on Thu Sep 07 2017 started...
Success posting SSLP-1842 : 1h
Success posting SSLP-1774 : 5h
```
Two entries *SSLP-1774* and *SSLP-1842* will have their worklog entries created

### How to install?

```bash
npm install -g time-log-poster
```

Go to your home folder e.g. 
```bash
cd ~
```

And create there a config file with name `.time-log-poster.config.json`.

Copy and paste following example content to your newly created file. 
```json
{
  "ticketRegex": "XXXX-[0-9]+",
  "jiraUrl": "https://jira.example.com",
  "authorizationToken": "Basic eW91cjpwYXNzd29yZA==="
}
```
You need to provide proper values for each configuration entry: `ticketRegex`, `jiraUrl` and `authorizationToken`. 
The two first are project specific, you should be able easily to find proper values on your own. 

#### authorizationToken
The third - `authorizationToken` holds a value for basic access authorization. The tool uses it while to make requests to Jira. 

You can create it easily by converting following text `username:passowrd` into base64 text. For instance by running following code (of course you need to replace `username` and `password` strings):
```js
var b = new Buffer('username:password');
console.log(b.toString('base64'));
```

### Ways of use

Passing json via pipe
```bash
t display -s  "Sep 07" -e "Sep 07" -fjson | time-log-poster
```

Passing json as an argument
```bash
time-log-poster "[{\"id\":139,\"note\":\"\",\"start\":\"2017-09-0710:20:00+0200\",\"end\":\"2017-09-0710:50:00+0200\",\"sheet\":\"SSLPortal\"}]" 
```
