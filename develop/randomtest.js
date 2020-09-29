const prefixe = [
  "!randomtest"
];
const DEBUG = true;

const konstanten = require('./Konstanten.js');

const Durchlaeufe = 100000000;

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
    if ( message.prefix == "!randomtest" ) {
      process.send({
        type: konstanten.sendeAnChat,
        target: message.target,
        nachricht: "@" + message.username + " Es werden " + (Durchlaeufe*50) + " Randomzahlen zwischen 0 und 49 gebildet und gezählt. Ausgewertet werden jeweils 0,1% Abweichungen:"
      });
      let ergebnisse = [];
      for ( let i = 0; i < 50; i++ ) {
        ergebnisse[i] = 0;
      }
      for ( let i = 0; i < Durchlaeufe*50; i++ ) {
        ergebnisse[Math.floor(Math.random()*50)]++
      }
      let nachricht = "";
      for ( let i = 0; i < 50; i++ ) {
        let add = "0";
        if (ergebnisse[i]/Durchlaeufe > 1.001) add = "+";
        if (ergebnisse[i]/Durchlaeufe < 0.999) add += "-";
        nachricht += add;
      }
      
      process.send({
        type: konstanten.sendeAnChat,
        target: message.target,
        nachricht: nachricht
      });
    }
  }
});

//process.send("Kind hier. " + process.send);
process.send({
  type: konstanten.anwesend,
  prefixe: prefixe
});
