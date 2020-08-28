const admins = ["dinoagw"];

const DEBUG = true;
const scriptname = "twitchChat[" + process.pid + "]";

const pwd = require('./Passwort.js');
const konstanten = require('./Konstanten.js');
const tmi = require('tmi.js');

var activeChannels = {};
var flushChannels = {};
var clients = {};
var qaClient = new tmi.client({
  connection: {reconnect: true},
  channels: []
});
qaClient.on('message', qaOnMessageHandler);
qaClient.on('connected', qaOnConnectedHandler);
qaClient.connect();
var nachrichten = {};
var lastNachricht = {};
var cooldown = {};
var onMessageHandler = {};

//die channels Liste füllt sich zurzeit nur immer weiter.
//Um dies zu vermeiden, könnte man statt eine nachrichtenliste mit einer Eventliste füllen mit nachrichtsenden oder kanallöschen etc.
setInterval(() => {
  for ( let script in activeChannels ) {
    for ( let username in activeChannels[script] ) {
      for ( let iter in activeChannels[script][username] ) {
        let target = activeChannels[script][username][iter];
        cooldown[username][target]--;
        if ( cooldown[username][target]==-31000 ) {
          cooldown[username][target] = 0;
          sende( username, target, lastNachricht[username][target]);
        } else if ( cooldown[username][target]==0 ) {
          if ( nachrichten[username][target].length>0 ) {
            if ( lastNachricht[username][target] == nachrichten[username][target][0] ) {
              cooldown[username][target] = 31000;
              delete lastNachricht[username][target];
            } else {
              lastNachricht[username][target] = nachrichten[username][target][0];
              nachrichten[username][target].shift();
              sende( username, target, lastNachricht[username][target] );
            }
          } else {
            cooldown[username][target] = 10;
          }
        }
      }
    }
  }
  for ( let script in flushChannels ) {
    for ( let username in flushChannels[script] ) {
      for ( let iter in flushChannels[script][username] ) {
        let target = flushChannels[script][username][iter];
        cooldown[username][target]--;
        if ( cooldown[username][target]==-31000 ) {
          cooldown[username][target] = 0;
          sende( username, target, lastNachricht[username][target]);
        } else if ( cooldown[username][target]==0 ) {
          if ( nachrichten[username][target].length>0 ) {
            if ( lastNachricht[username][target] == nachrichten[username][target][0] ) {
              cooldown[username][target] = 31000;
              delete lastNachricht[username][target];
            } else {
              lastNachricht[username][target] = nachrichten[username][target][0];
              nachrichten[username][target].shift();
              sende( username, target, lastNachricht[username][target] );
            }
          } else {
            flushChannels[script][username].splice(iter, 1);
            iter--;
            let keep = false;
            //schaue ob noch wer Interesse an target hat, sonst part qa
            if ( flushChannels[script][username].length==0 ) {
              delete flushChannels[script][username];
              if ( flushChannels[script].length==0 ) {
                delete flushChannels[script];
              }
            }
            cooldown[username][target] = 10;
          }
        }
      }
    }
  }
}, 1);

function qaOnMessageHandler (target, context, msg, self) {
  target = target.substring(1);
  for ( let script in activeChannels ) {
    if ( activeChannels[script]!=undefined && activeChannels[script][context.username]!=undefined ) {
      if ( DEBUG ) console.log(scriptname, "QA:", self, target, context.mod, context.username, msg);
      if ( msg == lastNachricht[context.username][target] ) {
        if ( context.mod ){
          cooldown[context.username][target] = 1;
        } else {
          cooldown[context.username][target] = 2000;
        }
      }
      return;
    }
  }
  for ( let script in flushChannels ) {
    if ( flushChannels[script]!=undefined && flushChannels[script][context.username]!=undefined ) {
      if ( DEBUG ) console.log(scriptname, "QA:", self, target, context.mod, context.username, msg);
      if ( msg == lastNachricht[context.username][target] ) {
        if ( context.mod ){
          cooldown[context.username][target] = 1;
        } else {
          cooldown[context.username][target] = 2000;
        }
      }
      return;
    }
  }
}

process.on('message', (message) => {
  if ( message.type == konstanten.befehl ) {
    if ( message.prefix == "!stop" ) {
      if ( DEBUG ) console.log( scriptname, "Message:", message );
      console.log( scriptname, "Beende mich nun");
      process.exit();
    }
  }
  if ( message.type == konstanten.sendeAnTwitchChat ) {
    if ( DEBUG ) console.log( scriptname, "sendeAnTwitchChat", message.script, message.username, message.target, message.nachricht );
    if ( (activeChannels[message.script]==undefined || activeChannels[message.script][message.username]==undefined || !activeChannels[message.script][message.username].includes(message.target)) 
      && (flushChannels[message.script]==undefined || flushChannels[message.script][message.username]==undefined || !flushChannels[message.script][message.username].includes(message.target)) ) {
      if ( cooldown[message.username] == undefined ) cooldown[message.username] = {};
      if ( cooldown[message.username][message.target] == undefined ) cooldown[message.username][message.target] = 1;
      if ( nachrichten[message.username] == undefined ) nachrichten[message.username] = {};
      if ( nachrichten[message.username][message.target] == undefined ) nachrichten[message.username][message.target] = [];
      if ( lastNachricht[message.username] == undefined ) lastNachricht[message.username] = {};
      if ( flushChannels[message.script]==undefined ) flushChannels[message.script] = {};
      if ( flushChannels[message.script][message.username]==undefined ) flushChannels[message.script][message.username] = [];
      flushChannels[message.script][message.username].push(message.target);
      qaJoin( message.target );
    }
    nachrichten[message.username][message.target].push(message.nachricht);
  }
  if ( message.type == konstanten.starteTwitchChat ) {
    if ( DEBUG ) console.log( scriptname, "starteTwitchChat", message.script, message.username, message.channels );
    if ( cooldown[message.username] == undefined ) cooldown[message.username] = {};
    if ( nachrichten[message.username] == undefined ) nachrichten[message.username] = {};
    if ( lastNachricht[message.username] == undefined ) lastNachricht[message.username] = {};
    if ( activeChannels[message.script]==undefined ) activeChannels[message.script] = {};
    if ( activeChannels[message.script][message.username]==undefined ) activeChannels[message.script][message.username] = [];
    for ( let iter in message.channels ) {
      cooldown[message.username][message.channels[iter]] = 1000;
      nachrichten[message.username][message.channels[iter]] = [];
      activeChannels[message.script][message.username].push( message.channels[iter] );
      qaJoin( message.channels[iter] )
    }
    if ( clients[message.username]==undefined ) {
      let opts = {
        connection: {
          reconnect: true
        },
        channels: message.channels,
        identity: {
          username: message.username,
          password: message.password
        }
      };
      onMessageHandler[message.username] = function (target, context, msg, self) {
        target = target.substring(1);
        if ( self ) {
          return;
        }
        for ( let username in activeChannels[message.script] ) {
          if ( username != context.username ) {
            for ( let iter in activeChannels[message.script][username] ) {
              if ( target == activeChannels[message.script][username][iter] ) {
                if ( DEBUG ) console.log( scriptname, "onMessageHandler", message.script, username, target, msg );
                process.send({
                  type: konstanten.empfangeVonTwitchChat,
                  script: message.script,
                  username: username,
                  target: target,
                  context: context,
                  msg: msg
                });
              }
            }
          }
        }
      }
      clients[message.username] = new tmi.client(opts);
      clients[message.username].on('message', onMessageHandler[message.username]);
      clients[message.username].on('connected', onConnectedHandler);
      clients[message.username].connect();
    }
  }
  if ( message.type == konstanten.joinTwitchChat ) {
    if ( DEBUG ) console.log( scriptname, "joinTwitchChat", message.script, message.username, message.target );
    let check = setInterval(()=>{
      if ( clients[message.username] != undefined ) {
        if ( activeChannels[message.script]==undefined || activeChannels[message.script][message.username]==undefined || !activeChannels[message.script][message.username].includes(message.target) ) {
          join( message.script, message.username, message.target );
        } else {
          console.log(scriptname, "Bin bereits mit Kanal", message.target, "verbunden.");
        }
        clearInterval(check);
      }
    }, 10);
  }
  if ( message.type == konstanten.partTwitchChat ) {
    if ( DEBUG ) console.log( scriptname, "partTwitchChat", message.script, message.username, message.target );
    let check = setInterval(()=>{
      if ( clients[message.username] != undefined ) {
        if ( activeChannels[message.script]==undefined || activeChannels[message.script][message.username]==undefined || !activeChannels[message.script][message.username].includes(message.target) ) {
          console.log(scriptname, "Bin garnicht mit Kanal", message.target, "verbunden.");
        } else {
          part( message.script, message.username, message.target );
        }
        clearInterval(check);
      }
    }, 10);
  }
});

function sende( username, target, nachricht) {
  if ( DEBUG ) console.log(scriptname, "sende nun", username, target, nachricht);
  clients[username].say("#" + target, String(nachricht))
    .then(
      (data) => {console.log(scriptname, `gesendet data = ${data}`);}
    )
    .catch(
      (err) => {console.log(scriptname, `gesendet err = ${err}`);}
    );
}

function onConnectedHandler (addr, port) {
  console.log( scriptname, `Connected to ${addr}:${port}`);
}

function qaOnConnectedHandler (addr, port) {
  if ( DEBUG ) console.log( scriptname, `qa Connected to ${addr}:${port}`);
}

function join( script, username, kanal ) {
  if ( DEBUG ) console.log( scriptname, "joine nun", script, username, kanal );
  let check = setInterval(()=>{
    if( clients[username].readyState() == "OPEN" ) {
      cooldown[username][kanal] = 1000;
      nachrichten[username][kanal] = [];
      if ( activeChannels[script]==undefined ) activeChannels[script] = {};
      if ( activeChannels[script][username]==undefined ) activeChannels[script][username] = [];
      activeChannels[script][username].push( kanal );
        clients[username].join( "#" + kanal )
        .then(
          (data) => {console.log(scriptname, `join data = ${data}`);}
        )
        .catch(
          (err) => {console.log(scriptname, `join err = ${err}`);}
        );
      qaJoin( kanal );
      clearInterval(check);
    }
  }, 10);
}

function qaJoin( kanal ) {
  if ( DEBUG ) console.log( scriptname, "qa joine nun", kanal );
  let check = setInterval(()=>{
    if( qaClient.readyState() == "OPEN" ) {
      qaClient.join( "#" + kanal )
      .then(
        (data) => {if ( DEBUG ) console.log(scriptname, `qa join data = ${data}`);}
      )
      .catch(
        (err) => {console.log(scriptname, `qa join err = ${err}`);}
      );
      clearInterval(check);
    }
  }, 10);
}

function part( script, username, kanal ) {
  if ( DEBUG ) console.log( scriptname, "parte nun", script, username, kanal );
  if ( activeChannels[script]!=undefined && activeChannels[script][username]!=undefined && activeChannels[script][username].includes(kanal) ) {
    for ( let iter in activeChannels[script][username] ) {
      if (activeChannels[script][username][iter] == kanal) {
        activeChannels[script][username].splice(iter, 1);
        iter--;
      }
    }
    if ( activeChannels[script][username].length==0 ) {
      delete activeChannels[script][username];
      if ( activeChannels[script].length==0 ) delete activeChannels[script];
    }
  } else {
    console.log( scriptname, "part aber nicht aktiv? oO" );
  }
  if ( nachrichten[username]!=undefined && nachrichten[username][kanal]!=undefined && nachrichten[username][kanal].length>0 ) {
    if ( flushChannels[script]==undefined ) flushChannels[script] = {};
    if ( flushChannels[script][username]==undefined ) flushChannels[script][username] = [];
    flushChannels[script][username].push(kanal);
  }
  let keep = false;
  for ( let a_script in activeChannels ) {
    for ( let a_username in activeChannels[a_script] ) {
      for ( let iter in activeChannels[a_script][a_username] ) {
        if( kanal == activeChannels[a_script][a_username][iter]) keep = true;
      }
    }
  }
  if ( !keep ) {
    clients[username].part( "#" + kanal )
    .then(
      (data) => {console.log(scriptname, `part data = ${data}`);}
    )
    .catch(
      (err) => {console.log(scriptname, `part err = ${err}`);}
    );
  }
}
