# Einleitung
Dies ist die Twitch Chatbot Kollektion,
geschrieben von Alfred Wutschka,
auch bekannt als DinoAGW auf Twitch: https://www.twitch.tv/dinoagw.

# Installation
(Aus dem Gedächtnis. Wer es ausprobiert, bitte präzisieren.)
1) Projekt herunterladen
2) Node.js installieren
3) $ npm install tmi.js
4) npm install random-js
5) $ npm install mariadb
Falls noch keine Datenbanksoftware vorhanden:
6) $ apt install mariadb
7) unter mariadb 'db1' Datenbank anlegen
8) Datenbankbenutzer mit Passwort anlegen und Rechte für db1 vergeben (weiß ich nun nicht mehr so genau wie.)
9) unter mariadb Tabellen aufsetzen:
* $ CREATE TABLE merke (id INT NOT NULL AUTO_INCREMENT, text VARCHAR (100), PRIMARY KEY (id));
* $ CREATE TABLE todo (id INT NOT NULL AUTO_INCREMENT, kanal VARCHAR (25), user VARCHAR (25), text VARCHAR (1000), status VARCHAR (100), PRIMARY KEY (id));
* $ CREATE TABLE punkte (name VARCHAR (25) NOT NULL, punkte INT, extrapoint INT, einsatz INT DEFAULT 0, PRIMARY KEY (name));
* $ CREATE TABLE sync (kanal VARCHAR (25) NOT NULL, raum INT DEFAULT 0, PRIMARY KEY (kanal));
* $ CREATE TABLE bot (kanal VARCHAR (25) NOT NULL, raum INT DEFAULT 0, PRIMARY KEY (kanal));
10) Passwort.js anlegen mit Inhalt:
module.exports = {
  <Name des Chatbots>: "oauth:<oauth key das Chatbots>",
  mariadb: "Passwort des Datenbanknutzers"
}
11) mit "$ node dinoagw_bot.js" lässt sich der Bot dann starten

# Funktionalitäten soweit

## dinoagw_bot
Hauptbot zum starten, stoppen, verwalten der Helper-skripte.
Mittels !invitebot kanal können Botadmins andere Nutzer dazu einladen den Bot mitzubenutzen. Mit !stopbot können diese später die Mitnutzung widerrufen.
Wenn alle Stricke reissen: mit !notaus können die Streamer auch den Bot für ALLE beenden. (Sollte nicht gebraucht werden, aber man weiss ja nie^^)

## chatsync
Helper-skript zur Verwaltung und Implementierung von Chaträumen.
Mit !sync betritt man einen Chatraum, mit !invite kanal lädt man einen Kanal zu sich in den Chatraum ein.
Chats die gemeinsam in einem Chatraum sind, werden miteinander synchronisiert.
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

## twitchChat
Helper-skript um die Interaktion mit dem Chat zu verwalten.
Wird von dinoagw_bot und von chatsync genutzt.
Reiht alle zu sendenden Nachrichten in einer Warteschlange auf, sendet die nach und nach und fährt erst fort wenn die letzte Nachricht angekommen ist.
Wartet 31 Sekunden bei wiederholten Nachrichten und 2 Sekunden zwischen allen Nachrichten, falls der Bot nicht mod ist.

# P.S.
Diese Readme wird sporadisch gepflegt. Wenn etwas nicht stimmt, bitte eine Flüsternachricht auf Twitch an DinoAGW, sonst findet ihr mich auch auf meinem Discord Server: https://discord.gg/m4c79XN
