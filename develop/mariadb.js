const DEBUG = true;

const scriptname = "mariadb:";
const konstanten = require('./Konstanten.js');
const pwd = require('./Passwort.js');
const mariadb = require('mariadb');

const pool = mariadb.createPool({
     host: 'localhost', 
     user:'chatsync', 
     password: pwd.mariadb,
     database: 'db1',
     connectionLimit: 5
});

process.on('message', async (message) => {
  if ( message.type == konstanten.befehl ) {
    if ( message.prefix == "!stop" ) {
      if ( DEBUG ) console.log( scriptname, "Message:", message );
      console.log( scriptname, "Beende mich nun");
      process.exit();
    }
  }
  if ( message.type == konstanten.datenbankEingabe ) {
    if ( DEBUG ) console.log(scriptname, "datenbankEingabe", message.query, message.variables );
    let conn;
    let res;
    try {
      conn = await pool.getConnection();
      if ( DEBUG ) console.log(scriptname, "Datenbankeingabe: ", message.query, message.variables);
      res = await conn.query(message.query, message.variables);
      if ( DEBUG ) console.log(scriptname, "Datenbankeingabe ergab: ", res);
    } catch (err) {
      console.log(scriptname, "Datenbankanfrage fehlgeschlagen: ", message.query, " " , message.variables);
      throw err;
    } finally {
      if (conn) return conn.end();
    }
  }
  if ( message.type == konstanten.datenbankAbfrage ) {
    if ( DEBUG ) console.log(scriptname, "datenbankAbfrage", message.query, message.variables, message.anfragenID );
    let conn;
    let res;
    if ( DEBUG ) console.log(scriptname, "Datenbankabfrage: ", message.query, message.variables);
    try {
      conn = await pool.getConnection();
      res = await conn.query(message.query, message.variables);
      if ( DEBUG ) console.log(scriptname, "Datenbankabfrage ergab: ", res);
      process.send({
        type: konstanten.datenbankAntwort,
        anfragenID: message.anfragenID,
        res: res,
      });
    } catch (err) {
      console.log(scriptname, "Datenbankanfrage fehlgeschlagen: ", message.query, " " , message.variables);
      throw err;
    } finally {
      if (conn) return conn.end();
    }
  }
});
