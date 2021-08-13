const prefixe = [
  "!petdinos",
  "!faden"
];
const DEBUG = true;

const konstanten = require('./Konstanten.js');

process.on('message', (message) => {
  if ( DEBUG ) console.log("Kind erhalten: ", message );
  if ( message.type == konstanten.nachricht ) {
    console.log("Erzeuger schreibt: ", message.nachricht);
  }
  if ( message.type == konstanten.befehl ) {
    if ( message.prefix == "!stop" ) {
      console.log("Kind: Beende mich nun");
      process.exit();
      //clearInterval(aktiv);
    }
    if ( message.prefix == "!petdinos" ) {
      process.send({
        type: konstanten.sendeAnChat,
        target: message.target,
        nachricht: "schnurr @" + message.username
      });
    }
    if ( message.prefix == "!faden" ) {
      process.send({
        type: konstanten.sendeAnChat,
        target: message.target,
        nachricht: "Vermisstenanzeige für verlorenen Faden ist raus @" + message.username
      });
    }
  }
});

//process.send("Kind hier. " + process.send);
process.send({
  type: konstanten.anwesend,
  prefixe: prefixe
});
