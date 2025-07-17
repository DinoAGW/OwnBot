const konstanten = require('./Konstanten.js');
const prefixe = [
  "!todo"
];
const DEBUG = false;

process.on('message', (message) => {
  if ( DEBUG ) console.log("Kind erhalten: ", message );
  if ( message.type == konstanten.nachricht ) {
    console.log("Erzeuger schreibt: ", message.nachricht);
  }
  if ( message.type == konstanten.befehl ) {
    if ( message.prefix == "!stop" ) {
      console.log("Kind: Beende mich nun");
      process.exit();
    }
    if ( message.prefix == "!todo" ) {
      if ( message.isAdmin || message.isStreamer || message.isMod ) {
        process.send({
          type: konstanten.datenbankEingabe,
          query: "INSERT INTO todo ( kanal, user, text, status ) VALUE ( ?, ?, ?, 'open')",
          variables: [ message.target.substring(1), message.username, message.argument ]
        });
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " gemerkt."
        });
      } else {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " Du bist nicht dazu autorisiert diesen Befehl zu nutzen."
        });
      }
    }
  }
});

//process.send("Kind hier. " + process.send);
process.send({
  type: konstanten.anwesend,
  prefixe: prefixe
});
