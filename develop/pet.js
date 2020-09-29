const prefixe = [
  "!petdinos"
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
  }
});

//process.send("Kind hier. " + process.send);
process.send({
  type: konstanten.anwesend,
  prefixe: prefixe
});
