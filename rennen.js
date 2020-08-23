const konstanten = require('./Konstanten.js');
const myKonstanten = {
}
const prefixe = [
  "!rennen"
];
const DEBUG = false;
const timeTillTimeout = 120;

var eineAnfragenID = 0;
var offeneAnfragen = [];

var eineRennenID = 0
var offeneRennen = [];



process.on('message', (message) => {
  if ( DEBUG ) console.log("Kind erhalten: ", message );
  if ( message.type == konstanten.erinnereMich ) {
    if ( offeneRennen.length == 1 ) {
      process.send({
        type: konstanten.datenbankEingabe,
        query: "UPDATE punkte SET punkte = punkte+"+offeneRennen[0].einsatz+", einsatz = einsatz-"+offeneRennen[0].einsatz+" WHERE name = ?",
        variables: [ offeneRennen[0].username ]
      });
      process.send({
        type: konstanten.sendeAnChat,
        target: offeneRennen[0].target,
        nachricht: "@" + offeneRennen[0].username + ": timeout."
      });
      offeneRennen = [];
    } else {
      //Rennen kann durchgeführt werden
      let nummer = 0;
      let nachricht = "";
      for (iter in offeneRennen) {
        nachricht += "Dino #" + (++nummer) + "-" + (nummer+=offeneRennen[iter].einsatz-1) + " sind von " + offeneRennen[iter].username
        if ( iter < offeneRennen.length-1 ) {
          nachricht += ", ";
        } else {
          nachricht += ".";
        }
      }
      process.send({
        type: konstanten.sendeAnChat,
        target: message.target,
        nachricht: nachricht
      });
      if ( DEBUG ) console.log("Insgesamt: ", nummer );
      let random = Math.floor(Math.random()*nummer)+1;
      nummer = 0;
      let gewinn = 0;
      let gewinner;
      for (iter in offeneRennen) {
        if ( nummer < random && random <= nummer + offeneRennen[iter].einsatz ) {
          gewinner = offeneRennen[iter];
        } else {
          gewinn += offeneRennen[iter].einsatz;
          process.send({
            type: konstanten.datenbankEingabe,
            query: "UPDATE punkte SET einsatz = einsatz-"+offeneRennen[iter].einsatz+" WHERE name = ?",
            variables: [ offeneRennen[iter].username ]
          });
        }
        nummer += offeneRennen[iter].einsatz;
      }
      process.send({
        type: konstanten.datenbankEingabe,
        query: "UPDATE punkte SET einsatz = einsatz-"+gewinner.einsatz+", punkte = punkte+"+(gewinn+gewinner.einsatz)+" WHERE name = ?",
        variables: [ gewinner.username ]
      });
      process.send({
        type: konstanten.sendeAnChat,
        target: message.target,
        nachricht: "Gewonnen hat der Dinosaurier mit der Nummer " + random + ". @" + gewinner.username + " gewinnt " + gewinn + " Dinos. Glückwunsch^^" 
      });
      offeneRennen = [];
    }
  }
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
    //wenn keine passende Anfrage gefunden wurde, was soll dann geschehen?
    if ( DEBUG ) console.log("Anfrage: ", anfrage);
    if ( anfrage.type == myKonstanten.updatefrage ) {
      if ( message.res.affectedRows == 1) {
        //er kann sich ein Duell leisten
        if ( offeneRennen.length == 0 ) {
          //erster Teilnehmer
          let rennen = {
            id: ++eineRennenID,
            username: anfrage.username,
            target: anfrage.target,
            einsatz: anfrage.einsatz
          }
          offeneRennen.push(rennen);
          process.send({
            type: konstanten.sendeAnChat,
            target: anfrage.target,
            nachricht: "@" + anfrage.username + " hat mit " + anfrage.einsatz + " Dinos ein neues Rennen gestartet. Schreibe !rennen einsatz um an dem Rennen teilzunehmen."
          });
          process.send({
            type: konstanten.erinnereMich,
            time: timeTillTimeout,
            nachricht: {
              type: konstanten.erinnereMich,
              username: anfrage.username,
              target: anfrage.target,
              id: eineRennenID
            }
          });
        } else {
          let rennen = {
            id: eineRennenID,
            username: anfrage.username,
            target: anfrage.target,
            einsatz: anfrage.einsatz
          }
          offeneRennen.push(rennen);
          process.send({
            type: konstanten.sendeAnChat,
            target: anfrage.target,
            nachricht: "@" + anfrage.username + " nimmt mit " + anfrage.einsatz + " Dinos am Rennen teil."
          });
        }
      } else {
        //er kann sich kein Duell leisten
        process.send({
          type: konstanten.sendeAnChat,
          target: anfrage.target,
          nachricht: "@" + anfrage.username + " So viele Dinos hast Du nicht."
        });
      }
    }
  }
  if ( message.type == konstanten.befehl ) {
    if ( message.prefix == "!stop" ) {
      console.log("Kind: Beende mich nun");
      process.exit();
    }
    if ( message.prefix == "!rennen" ) {
      let einsatz = message.argument;
      let leerzeichenStelle = einsatz.indexOf(" ");
      if ( leerzeichenStelle>0 ) {
        einsatz = einsatz.slice(0, leerzeichenStelle);
      }
      einsatz = parseInt(einsatz, 10);
      if ( isNaN(einsatz) || einsatz<1 ) {
        process.send({
          type: konstanten.sendeAnChat,
          target: message.target,
          nachricht: "@" + message.username + " Der Befehl wird wie folgt genutzt: !rennen Einsatz (Einsatz = wieviel Dinos du ins Rennen schicken möchtest.)"
        });
      } else {
        if ( DEBUG ) console.log(message.username, einsatz);
        let id = eineAnfragenID++;
        let anfrage = {
          id: id,
          username: message.username,
          target: message.target,
          einsatz: einsatz
        };
        offeneAnfragen.push(anfrage);
        process.send({
          type: konstanten.datenbankAbfrage,
          anfragenID: id,
          query: "UPDATE punkte SET punkte=punkte-"+einsatz+",einsatz=einsatz+"+einsatz+"  WHERE name=? AND punkte>="+einsatz,
          variables: [ message.username ]
        });
      }
    }
  }
});

process.send({
  type: konstanten.anwesend,
  prefixe: prefixe
});

process.send({
  type: konstanten.datenbankEingabe,
  query: "UPDATE punkte SET punkte = punkte + einsatz, einsatz = 0 WHERE einsatz<>0",
  variables: [ ]
});
