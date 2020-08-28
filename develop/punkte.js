const konstanten = require('./Konstanten.js');
const prefixe = [
  "!dinos"
];
const DEBUG = false;

var eineAnfragenID = 0;
var offeneAnfragen = [];

process.on('message', (message) => {
  if ( DEBUG ) console.log("Kind erhalten: ", message );
  if ( message.type == konstanten.datenbankAntwort ) {
    if ( DEBUG ) console.log("Datenbankantwort #"+message.anfragenID+" erhalten: ", message );
    let anfrage;
    for (iter in offeneAnfragen) {
      if ( offeneAnfragen[iter].id == message.anfragenID ) {
        anfrage = offeneAnfragen[iter];
        offeneAnfragen.splice(iter, 1);
        break;
      }
    }
    if ( DEBUG ) console.log("Anfrage: ", anfrage);
    if ( message.res.length == 0 ) {
      process.send({
        type: konstanten.sendeAnChat,
        target: anfrage.target,
        nachricht: "@" + anfrage.username + " Du hast noch keine Dinos. Sende einmal \"Hallo @dinoagw_bot\" um ein Startguthaben von 100 Dinos zu erhalten."
      });
    } else {
      let punkte = message.res[0].punkte;
      process.send({
        type: konstanten.sendeAnChat,
        target: anfrage.target,
        nachricht: "@" + anfrage.username + " Bei mir hast Du " + punkte + " Dinos."
      });
    }
  }
  if ( message.type == konstanten.befehl ) {
    if ( message.prefix == "!stop" ) {
      console.log("Kind: Beende mich nun");
      process.exit();
    }
    if ( message.prefix == "!dinos" ) {
      let id = eineAnfragenID++;
      let anfrage = {id: id, username: message.username, target: message.target };
      process.send({
        type: konstanten.datenbankAbfrage,
        anfragenID: id,
        query: "SELECT punkte FROM punkte WHERE name = ?",
        variables: [ message.username ]
      });
      offeneAnfragen.push(anfrage);
    }
  }
});

process.send({
  type: konstanten.anwesend,
  prefixe: prefixe
});
