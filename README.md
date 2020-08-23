# Einleitung
Dies ist die Twitch Chatbot Kollektion,
geschrieben von Alfred Wutschka,
auch bekannt als DinoAGW auf Twitch: https://www.twitch.tv/dinoagw.

# Installation
(Aus dem Gedächtnis. Wer es ausprobiert, bitte präzisieren.)
1) Projekt herunterladen
2) Node.js installieren
3) $ npm install tmi.js
4) $ npm install mariadb
Falls noch keine Datenbanksoftware vorhanden:
5) $ apt install mariadb
6) unter mariadb 'db1' Datenbank anlegen
7) Datenbankbenutzer mit Passwort anlegen und Rechte für db1 vergeben (weiß ich nun nicht mehr so genau wie.)
8) unter mariadb Tabellen aufsetzen:
* $ CREATE TABLE merke (id INT NOT NULL AUTO_INCREMENT, text VARCHAR (100), PRIMARY KEY (id));
* $ CREATE TABLE todo (id INT NOT NULL AUTO_INCREMENT, kanal VARCHAR (25), user VARCHAR (25), text VARCHAR (1000), status VARCHAR (100), PRIMARY KEY (id));
* $ CREATE TABLE punkte (name VARCHAR (25) NOT NULL, punkte INT, extrapoint INT, einsatz INT DEFAULT 0, PRIMARY KEY (name));
* $ CREATE TABLE sync (kanal VARCHAR (25) NOT NULL, raum INT DEFAULT 0, PRIMARY KEY (kanal));
9) Passwort.js anlegen mit Inhalt:
module.exports = {
  <Name des Chatbots>: "oauth:<oauth key das Chatbots>",
  mariadb: "Passwort des Datenbanknutzers"
}
10) mit "$ node dinoagw_bot.js" lässt sich der Bot dann starten

# Funktionalitäten soweit

## dinoagw_bot
Hauptbot zum starten, stoppen, verwalten der Helper-skripte.

## chatsync
Helper-skript zur Verwaltung und Implementierung von Chaträumen.
Mittels !multi kann man sich einen Multristre.am Link aller Teilnehmer ausgeben lassen.

Usage: !invite kanal, !stopallsync, !sync, !kick Kanal
Wenn Verbunden: !multi, !stopsync

## hallo
Helper-skript um den Nutzern beim ersten mal 100, bei jedem weiteren mal (ein mal am Tag möglich) weitere 10 "Dinos" zu verleihen.

Usage: hallo @dinoagw_bot

## punkte
Helper-skript zur Ausgabe des aktuellen "Dino" Guthabens.

Usage: !dinos

## duell
Helper-skript um mit einem anderen User um Dinos zu duellieren.
Der Verlierer verliert seinen Einsatz an den Gewinner.
Je mehr man einsetzt, umso wahrscheinlicher gewinnt man.

Usage: !duell @zielperson einsatz

## rennen
Helper-skript um mit einigen Spielern gemeinsam ein Rennen zu veranstalten.
Widerrum gilt: je höher der Einsatz umso höher die Chancen.
Der Gewinner kriegt die Einsätze von allen Anderen.

Usage: !rennen einsatz

# P.S.
Diese Readme wird sporadisch gepflegt. Wenn etwas nicht stimmt, bitte eine Flüsternachricht auf Twitch an DinoAGW, sonst findet ihr mich auch auf meinem Discord Server: https://discord.gg/m4c79XN
