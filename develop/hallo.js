const prefixe = [
  "hallo",
  "!hallo",
  "@dinoagw_bot",
  "dinoagw_bot"
];
const DEBUG = false;

const konstanten = require('./Konstanten.js');
const utilities = require('./utilities.js');
var eineAnfragenID = 0;
var offeneAnfragen = [];

process.on('message', (message) => {
  if ( DEBUG ) console.log("Kind erhalten: ", message );
  if ( message.type == konstanten.nachricht ) {
    console.log("Erzeuger schreibt: ", message.nachricht);
  }
  if ( message.type == konstanten.datenbankAntwort ) {
    if ( DEBUG ) console.log("Datenbankantwort #"+message.anfragenID+" erhalten: ", message );
    let anfrage;
    for (iter in offeneAnfragen) {
      if ( offeneAnfragen[iter].id == message.anfragenID ) {
        anfrage = offeneAnfragen[iter];
        offeneAnfragen.slice(iter, 1);
        break;
      }
    }
    if ( DEBUG ) console.log("Anfrage: ", anfrage);
    if ( message.res.length == 0 ) {
      process.send({
        type: konstanten.sendeAnChat,
        target: anfrage.target,
        nachricht: "Hallo @" + anfrage.username + ". Schön Dich kennen zu lernen =)"
      });
      process.send({
        type: konstanten.datenbankEingabe,
        query: "INSERT INTO punkte ( name, punkte, extrapoint ) VALUE ( ?, ?, CURDATE() )",
        variables: [ anfrage.username, 100 ]
      });
    } else if ( message.res[0].extrapoint < utilities.yyyymmdd() ) {
      process.send({
        type: konstanten.sendeAnChat,
        target: anfrage.target,
        nachricht: "Hallo @" + anfrage.username + "."
      });
      let punkte = message.res[0].punkte + 10;
      process.send({
        type: konstanten.datenbankEingabe,
        query: "UPDATE punkte SET punkte = ?, extrapoint = CURDATE() WHERE name = ?",
        variables: [ punkte, anfrage.username ]
      });
    } else {
      process.send({
        type: konstanten.sendeAnChat,
        target: anfrage.target,
        nachricht: "Hallo @" + anfrage.username + ". Wir hatten aber heute schon einmal das Vergnügen^^"
      });
    }
  }
  if ( message.type == konstanten.befehl ) {
    if ( message.prefix == "!stop" ) {
      console.log("Kind: Beende mich nun");
      process.exit();
      //clearInterval(aktiv);
    }
    if (
      (
        ( message.prefix == "hallo" ) && (
          message.argument.toLowerCase().startsWith("@dinoagw_bot") || message.argument.toLowerCase().startsWith("dinoagw_bot") 
        )
      ) || (
        ( message.argument.toLowerCase().startsWith("hallo") ) && (
          message.prefix == "@dinoagw_bot" || message.prefix == "dinoagw_bot"
        )
      )
    ) {
      let id = eineAnfragenID++;
      let anfrage = {id: id, username: message.username, target: message.target };
      process.send({
        type: konstanten.datenbankAbfrage,
        anfragenID: id,
        query: "SELECT punkte, extrapoint FROM punkte WHERE name = ?",
        variables: [ message.username ]
      });
      offeneAnfragen.push(anfrage);
    }
    if ( message.prefix == "!hallo" ) {
      if ( message.argument.toLowerCase().startsWith("@dinoagw_bot") || message.argument.toLowerCase().startsWith("dinoagw_bot") ) {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + ": Mit Ausrufezeichen fühle ich mich genötigt zurück zu Grüßen, da mag ich nicht. Bitte schreibe \"Hallo @dinoagw_bot\" ohne Ausrufezeichen am Anfang. Danke"
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
