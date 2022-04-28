const prefixe = [
  "!sage"
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
    if ( message.prefix == "!sage" ) {
      if ( message.isAdmin ) {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: message.argument
        });
      } else {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "Das dürfen nur Admins @" + message.username + ". Sonst wäre das ja gemein gefährlich"
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
