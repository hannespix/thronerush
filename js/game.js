/* THRONERUSH – Spiellogik. Siehe CLAUDE.md fuer Architektur. */
(() => {
  "use strict";
  // Einmalige Migration alter Speicher-Keys (neondrift_* → thronerush_*): Spielstände, Chips, Highscores & Einstellungen bleiben beim Rebrand erhalten.
  try{ if(!localStorage.getItem('thronerush_migrated')){
    ['lang','best','meta','opt','tlog','run','cid'].forEach(k=>{ const ov=localStorage.getItem('neondrift_'+k);
      if(ov!=null){ if(localStorage.getItem('thronerush_'+k)==null) localStorage.setItem('thronerush_'+k,ov); localStorage.removeItem('neondrift_'+k); } });
    localStorage.setItem('thronerush_migrated','1'); } }catch(e){}
  const canvas=document.getElementById('c'), ctx=canvas.getContext('2d');
  const S={MENU:0,PLAY:1,UPGRADE:2,OVER:3,PAUSE:4};
  /* === AUTO-BALANCE START (wird von tools/auto-balance.mjs gepflegt – nur Werte, keine Logik!) === */
  const BAL={ difficulty:1.15, spawnRate:1.12, eliteChance:1.20, enemyHp:1.00 };   // Multiplikatoren (1.00 = neutral). Höher = schwerer / mehr.
  /* === AUTO-BALANCE END === */
  let state=S.MENU, mode='normal';
  let DPR=Math.min(window.devicePixelRatio||1,2), W=0, H=0, lastT=0;
  let frameMs=16, fxQ=1, qScale=1, vsyncMs=16, _lowfx=false;   // Performance-Governor: geglättete Frame-Zeit, FX-Qualität, interne Render-Skala, erkannte Bildwiederholrate, CSS-Notbremse

  // ---------- i18n (DE / EN / FR, Jugendsprache je Sprache) ----------
  function detectLang(){ const l=((navigator.language||navigator.userLanguage||'en')+'').slice(0,2).toLowerCase(); return (l==='de'||l==='fr')?l:'en'; }
  function loadLang(){ try{ const s=localStorage.getItem('thronerush_lang'); if(s==='de'||s==='en'||s==='fr') return s; }catch(e){} return detectLang(); }
  let lang=loadLang();
  function saveLang(){ try{ localStorage.setItem('thronerush_lang',lang); }catch(e){} }
  function t(k){ const o=TR[lang]||TR.en; return (o[k]!=null?o[k]:(TR.en[k]!=null?TR.en[k]:k)); }
  function P(k){ const o=TR[lang]||TR.en; return o[k]||TR.en[k]||[]; }   // lokalisierter Pool
  const TR={
    de:{
      tag:'Jede Sitzung ein Highscore', daily:'🗓 TÄGLICHE CHALLENGE', playBtn:'▶ SPIEL STARTEN', workshop:'WERKSTATT', settings:'⚙️ EINSTELLUNGEN',
      howTitle:'BEREIT?', howGo:'LOS!', howDodge:'Weiche aus & bleib in Bewegung', howDodgeD:'Münzen, Combos & der Rest erklären sich ganz von selbst beim Spielen. 🎮',
      tipSP:'💠 Skillpunkt!', tipSPd:'Werkstatt 🛠️ unten öffnen & aufrüsten', tipSyn:'🔗 Fusion möglich!', tipSynd:'Werkstatt → „Synergien": 2 Waffen verschmelzen', tipNear:'✦ Knapp!', tipNeard:'Near-Miss = Combo & mehr Coins', tipCurse:'🎲 Fluch', tipCursed:'Riskant, mehr Punkte – läuft ab', coach_move:'🕹️ Bewegen', coach_moved:'Dein leuchtender Kern folgt Maus oder Finger. Lenk ihn ruhig durch die Lücken zwischen den Hindernissen.', coach_near:'✦ Near-Miss', coach_neard:'Ganz knapp an Gegnern vorbei = deine Combo steigt & es regnet mehr Münzen. Risiko lohnt sich!', coach_combo:'🔥 Combo-Faktor', coach_combod:'Jede 4. Combo-Stufe hebt deinen Punkte-Multiplikator. Bleib in Bewegung – ein Treffer setzt ihn zurück.', coach_beat:'🎵 Im Takt', coach_beatd:'Weich genau im Beat der Musik aus → „IM TAKT!": Extra-Combo, mehr Punkte und dein HYPE füllt schneller.', coach_coin:'🪙 Münzen', coach_coind:'Münzen sind deine Währung. In der Werkstatt 🛠️ kaufst du dauerhafte Upgrades – auch zwischen den Runs.', coach_jump:'🦘 Sprung', coach_jumpd:'Tippe dein Schiff an → spring über Gefahr hinweg und entkomme. Lädt danach automatisch nach.', coach_hype:'🌈 HYPE-Meter', coach_hyped:'Near-Misses füllen den Balken oben. Ist er voll → HYPE: Score ×2, Münz-Magnet & Regenbogen-Trail.', coach_letter:'🔤 BEUTE', coach_letterd:'Sammle die Buchstaben der Reihe nach ein. Wort komplett = fette Beute-Belohnung!', coach_sp:'💠 Skillpunkt', coach_spd:'Öffne die Werkstatt 🛠️ unten und schalte im Fähigkeitsbaum neue Waffen & Kräfte frei.', coach_shield:'🛡️ Schild', coach_shieldd:'Der Ring um dein Schiff fängt genau einen Treffer ab. Danach ist er weg – hol dir Nachschub.', coach_syn:'🔗 Synergie', coach_synd:'Zwei Waffen lassen sich in der Werkstatt verschmelzen → neuer Effekt + ÜBERLADUNG. Probier es aus!', coach_loot:'✦ Relikte', coach_lootd:'Zerstörte Gegner lassen ✦-Relikte fallen. Einsammeln = sofort stärker (Schaden, Krit, Münzen …). Je seltener die Farbe, desto krasser.', coach_wcrate:'🔫 Arsenal-Kiste', coach_wcrated:'Quadratische Kisten droppen Waffen. Freier Slot → neue Waffe gratis (auch noch nicht gekaufte!). Sonst gibt’s einen Skillpunkt.', coach_chest:'📦 Beute-Truhe', coach_chestd:'Die goldene Truhe schwebt durchs Feld. Riskier den Weg hin → beim Öffnen platzt eine Loot-Explosion + Münzen.',
      how:'Maus oder <b>Finger</b> · knapp vorbei = <b>Near-Miss-Bonus</b> · 🛡 sammeln · <b>ESC</b> = Menü', install:'📲 App installieren',
      ios:'Auf dem iPhone: <b>Teilen-Symbol</b> antippen → <b>„Zum Home-Bildschirm"</b> – dann läuft THRONERUSH als Vollbild-App.',
      m_normal:'ARCADE', m_normalD:'Levels, neue Formen, Boss-Wellen, Upgrade-Karten & Power-Ups. Das volle Programm.',
      m_hard:'BLITZ', m_hardD:'Brutal schnell, keine Level-Pausen. Nur Mut, Near-Misses & Power-Ups retten dich.',
      m_zen:'ZEN', m_zenD:'Kein Tod. Treffer kostet nur Combo. Entspannt sammeln, Highscore jagen.', mfeat_normal:'📈 Level|👾 Bosse|🃏 Upgrades', mfeat_hard:'⚡ Speed|🎯 Near-Miss|🔥 Brutal', mfeat_zen:'♾️ Kein Tod|🌊 Chill|🏆 Highscore',
      pause:'PAUSE', resume:'▶ WEITER', mainmenu:'☰ HAUPTMENÜ', chooseUp:'UPGRADE WÄHLEN', arsenal:'🔫 ARSENAL', level:'Level',
      newWeapon:'NEUE WAFFE', path:'PFAD', ckLblW:'Waffen', ckLblS:'Synergien', ckLblV:'Leben', slotsLbl:'Slots', synTitle:'Synergien', noSyn:'— noch keine —', drop:'ablegen', lockedW:'🔒 Werkstatt', equipHint:'Tippen zum Aus-/Einrüsten', arsenalTitle:'🛠️ WERKSTATT', hangar:'🛠️ WERKSTATT', arsenalTab:'Loadout', tabUpgrades:'Upgrades', freeSlot:'frei', arsenalBtn:'🛠️ WERKSTATT', synUnlocked:'SYNERGIE!', legChosen:'gewählt', legAvail:'wählbar', legLocked:'gesperrt', forkLocked:'🔒 In der Werkstatt freischalten', blueprint:'Bauplan', startWeapon:'Startwaffe', forkTier:'Fork-Stufe', cat_weapons:'Waffen', cat_ship:'Schiff', cat_power:'Kräfte', cat_economy:'Ökonomie', cat_cosmetic:'Kosmetik', cat_synergy:'Synergien', treeHint:'Pfade wählst du beim Level-Up', hangarHint:'Tippe Knoten/Waffe zum Kaufen', addWeapon:'Waffe holen', skillPts:'Skillpunkte',spStart:'Starter-Bonus',buySP:'Skillpunkt kaufen',needSP:'Keine Skillpunkte',needSPsub:'Bosse besiegen & Drops sammeln',needChips:'Nicht genug Chips',spDrop:'Boss-Beute!',statusTitle:'📊 GEFECHTSDATENBLATT',statusBtn:'Schiffsstatus',statDps:'Ø Schaden/s',statCrit:'Krit-Chance',statCritDmg:'Krit-Wucht',statLives:'Leben',statShield:'Schild',statLuck:'Glück',statScore:'Punkte-Boost',statCoin:'Coin-Boost',statHull:'Hitbox',statReach:'Nähe-Radius',statJump:'Sprünge',statOC:'Verstärkung',statTempo:'Feuerrate',statFirepower:'Feuerkraft-Verteilung',statNoWep:'Keine Waffen ausgerüstet.',statEst:'geschätzt', overchargeName:'Verstärken', fxSlow:'Zeitlupe', diffRating:'Anspruch', diffSpeed:'Tempo', diffArmor:'Gegner-HP', diffCoins:'Münzen', hiscores:'Highscores', lbTitle:'🏆 BESTENLISTE', lbBtn:'🏆 BESTENLISTE', lbView:'🏆 Bestenliste', lbSave:'🏆 SCORE SPEICHERN', lbSaving:'Speichere…', lbSaved:'✓ GESPEICHERT', lbBack:'← ZURÜCK', lbYourRank:'Dein Platz', lbEmpty:'Noch keine Einträge – sei der Erste! 🚀', lbLoading:'Lädt…', lbError:'Bestenliste gerade nicht erreichbar', lbOff:'Bestenliste offline', lbNetErr:'Speichern fehlgeschlagen – später nochmal', lbDailyTab:'🗓 Täglich', lbSubmitBest:'Meinen Rekord eintragen', nickTitle:'DEIN NAME', nickHint:'Dein Anzeigename für die Bestenliste (max. 16 Zeichen). Du bestimmst ihn selbst.', nickPh:'Spielername', nickSave:'SPEICHERN', nickCancel:'ABBRECHEN',fxMagnet:'Magnet', fxDouble:'×2 Punkte & Münzen', fxMirror:'Gespiegelt', curseOver:'vorbei!', fxMirrorSoon:'Spiegel folgt', fxMirOn:'GESPIEGELT!', fxMirOff:'normal', overchargeHint:'oder Pfad im Baum wählen', damage:'Schaden', skillHint:'💠 Tippe einen Knoten zum Freischalten', skillNext:'▶ WEITER', synOn:'aktiv', synNeed:'fehlt', synPick:'aktivieren', synFull:'Slots voll', synHint:'Fusionen kaufen → bis zum Slot-Limit frei kombinieren. Kills laden die ÜBERLADUNG – im Cockpit antippen (Tasten 1–4) für den Doppel-Skill beider Waffen!', ultReady:'ÜBERLADUNG bereit!', nextUp:'Nächstes Upgrade:', affordable:'leistbar!', toGo:'fehlen', reached:'Erreicht:', bosses:'Bosse', kitSave:'Start-Loadout merken', kitActive:'Start-Loadout aktiv', kitHint:'Diese Waffen werden zu Rundenbeginn automatisch eingerüstet (kostet je 1 Skillpunkt).', msPts:'Punkte', msWin:'Durchspielen', msReached:'MEILENSTEIN!', msTitle:'🎯 MEILENSTEINE', contTitle:'NOCHMAL?', contSub:'Wische den Bildschirm frei und mach weiter – jedes Weiterleben wird etwas teurer.', reviveBtn:'WEITERLEBEN', reviveBuy:'MÜNZEN HOLEN 🛒', giveup:'AUFGEBEN', reviveBanner:'WEITERLEBEN!', continueRun:'FORTSETZEN', jumpTxt:'HOPP!', jumpHint:'SPRUNG GELADEN!', jumpHint2:'Schiff antippen → drüberspringen & der Gefahr entkommen', loreTitle:'📖 STORY', loreLocked:'Noch nicht entdeckt – spiel weiter.', megaAtk:'MEGA-ATTACKE!', loreNext:'TIPPEN ZUM WEITER ▶', clutch:'CLUTCH', clutchSub:'Haarscharf durchgesprungen!', stomp:'RUMMS!', shareCleared:'DURCHGESPIELT!', shareGoal:'bis zum Boss-Finale', signature:'Signatur-Move', bossStun:'💫 BETÄUBT!', ranks:['Frischling','Pixel-Pilot','Drift-Kid','Neon-Ritter','Combo-Chef','Synthwave-Ass','Vaporlord','Throne-Gott'], rankLbl:'Rang', promo:'⭐ BEFÖRDERT', bonusWord:'BEUTE', bonusDone:'BEUTE KOMPLETT!', bonusSub:'Volle Beute kassiert! 🪙', onBeat:'IM TAKT!', breather:'DURCHATMEN', brCoins:'Münz-Regen! 🪙', brGift:'Kleines Geschenk 🎁', brSlow:'Zeitlupe ✨', hype:'HYPE', hypeTtl:'🌈 HYPE!', hypeSub:'Score ×2 & Münz-Magnet!', hypeEnd:'Hype vorbei', multikill:'MULTIKILL', missionsTitle:'🎯 RUN-MISSIONEN', missionDone:'MISSION ✓', msn_near:'%n Near-Misses', msn_combo:'Combo ×%n', msn_boss:'%n Boss besiegen', msn_level:'Level %n erreichen', msn_perfect:'%n perfekte Dodges', msn_jump:'%n Sprünge', msn_onbeat:'%n× im Takt', msn_beute:'%n× %w sammeln', recoTitle:'⭐ Beste nächste Upgrades', loot_common:'Gewöhnlich', loot_magic:'Magisch', loot_rare:'Selten', loot_epic:'Episch', aff_dmg:'Schaden', aff_rate:'Feuerrate', aff_crit:'Krit', aff_score:'Punkte', aff_coin:'Münzwert', aff_magnet:'Magnet', aff_near:'Near-Miss', aff_hull:'kleinere Hitbox', aff_life:'+1 Leben', aff_shield:'+1 Schild', aff_combo:'+1 Combo-Anker', aff_jump:'+1 Sprung', lootWeapon:'Neue Waffe', lootCrate:'Arsenal-Kiste', chestOpen:'TRESOR GEPLÜNDERT!', lootDiscover:'Neu entdeckt!', findFirst:'Erst im Spiel finden', discovered:'Entdeckt – mit Coins aufrüstbar',
      balance:'Guthaben', shopHint:'dauerhaft gespeichert · immer teurer & krasser', iapSoon:'Käufe nur in der Play-Store-App verfügbar.', iapNoSvc:'Play-Zahlungsdienst nicht verbunden – Play Store öffnen & erneut versuchen.', back:'← ZURÜCK', reallyQ:'WIRKLICH? ✓ (tippen)', resetTitle:'DATEN ZURÜCKSETZEN', rs_workshop:'🛠️ Arsenal & Werkstatt (Waffen, Upgrades, Chips, Skillpunkte)', rs_scores:'🏆 Highscores', rs_achskins:'🏅 Erfolge & Skins', rs_coach:'📚 Tutorial / Entdeckt-Codex', rs_all:'⚠️ ALLES löschen', rsDone:'✓ ZURÜCKGESETZT',
      setTitle:'EINSTELLUNGEN', tapToggle:'Tippen zum Umschalten', optMusic:'🎵 Musik', optSfx:'🔊 Game-Sound', optFull:'⛶ Vollbild', coins:'Coins', coinBalLbl:'Guthaben', coinSoon:'Käufe bald verfügbar', devHint:'Dev-/Tester-Code einlösen', redeem:'EINLÖSEN', devBad:'Ungültiger Code', devPlace:'z. B. dev1000', optShake:'📳 Screenshake & Vibration', optFx:'Bildschirm-Effekte', optCurses:'🎲 Lustige Flüche', optGuns:'🔫 Schießen / Waffen', optDmg:'🔢 Schadenszahlen', optMadness:'☣ Wahnsinn-Effekte', optTelemetry:'📊 Anonyme Statistik', tlmcTitle:'Spiel mitverbessern?', tlmcBody:'THRONERUSH kann nach jeder Runde ein paar <b>anonyme</b> Werte senden (Level, Score, Waffen …), damit wir das Balancing verbessern. <b>Kein Konto, kein Name, keine IP, keine Werbung.</b> Jederzeit in den Einstellungen änderbar.', tlmcYes:'JA, GERNE 📊', tlmcNo:'NEIN DANKE', tlmcFoot:'Mehr dazu in der Datenschutzerklärung.', tlmExport:'📤 Telemetrie exportieren', tlmDone:'✓ Kopiert', tlmEmpty:'noch keine Daten', optLang:'🌐 Sprache', advOpt:'Erweitert',
      on:'AN', off:'AUS', reduced:'REDUZIERT', activated:'aktiviert', loser:'LOSER', respec:'Skills zurücksetzen', reskilled:'zurückgenommen', crash:'CRASH', points:'Punkte', record:'Rekord', newRec:'★ NEUER REKORD ★', again:'NOCHMAL', share:'📤 TEILEN', menu:'MENÜ', best:'BEST',
      lvl:'LEVEL', newForm:'Neue Form: ', faster:'Schneller & dichter!', bossWave:'⚠ BOSS-WELLE ', megaBoss:'🛸 MEGA-BOSS', endgegner:'👾 DER ENDGEGNER', finaleSub:'überlebe das Inferno!',
      survived:'ÜBERLEBT!', defeated:'BESIEGT! 💥', escaped:'🛸 ENTKOMMEN…', escapedSub:'die Beute ist weg!', bossEscaped:'🛸 BOSS ENTKOMMEN!', lvlAgain:'Level nochmal:', armUp:'Rüste auf für den Boss · Level ',
      overdrive:'⚡ OVERDRIVE', overdriveSub:'du brennst!', enrage:'🔥 ENRAGE!', enrageSub:'es dreht völlig durch!',
      beaten:'🏆 DURCHGESPIELT!', beatenSub:'…aber es hört nicht auf.', madness:'☣ WAHNSINN-MODUS', madnessSub:'wie weit kommst du?', clearedTag:'🏆 DURCHGESPIELT!  ·  ',
      shieldGone:'SCHILD WEG!', comboGoneZ:'COMBO WEG', lifeLost:'−1 ♥', livesLeft:' ♥ ÜBRIG', comboOut:'COMBO AUS', perfect:'PERFEKT! 🎯', daily2:'🗓 DAILY',
      pSchild:'SCHILD', pSlow:'SLOW-MO', pMagnet:'MAGNET', pDouble:'✕2 PUNKTE & 🪙', pBomb:'BOMBE', boom:'BOOM!', boomSub:' pulverisiert', curseTag:'🎲 FLUCH',
      shareScore:' Punkte! Schlag mich 🔥 ', beatMe:'SCHLAG MICH. 🔥', pointsBig:'PUNKTE', dailyLbl:'TÄGLICH', modeDaily:'TÄGLICH',
      achBtn:'🏅 ERFOLGE', shipDesigner:'Schiff-Designer', il_ach:'Erfolge', il_lb:'Top', il_status:'Status', il_ship:'Schiff', il_coin:'Coins', il_set:'Setup', achTitle:'ERFOLGE', achGot:'🏅 ERFOLG', locked:'gesperrt', active:'AKTIV', choose:'WÄHLEN', customShip:'Eigenes Schiff', newShip:'Neues Schiff', del:'Löschen', shipDefault:'Schiff', design:'Entwerfen', edit:'Bearbeiten', pixels:'Pixel', templates:'Vorlagen', glowUnlock:'Glow freischalten', codexTitle:'📚 ENTDECKT', codexLocked:'Noch nicht entdeckt – spiel weiter.', cefCrit:'🎯 Kritischer Treffer', cefCritd:'Manche Schüsse sind Krits – doppelter (roter) Schaden. Die Krit-Chance steigerst du mit Upgrades.', cefMag:'🧲 Magnet', cefMagd:'Zieht kurz alle Münzen automatisch zu dir. Einfach weiter ausweichen – das Sammeln läuft von selbst.', cefSlow:'⏱ Zeitlupe', cefSlowd:'Verlangsamt kurz die ganze Welt – perfekt, um aus engen Situationen herauszuzirkeln.', cefDbl:'✕2 Punkte', cefDbld:'Kurze Zeit zählen Punkte UND Münzen doppelt. Jetzt lohnt sich Risiko besonders!', cefBomb:'💣 Bombe', cefBombd:'Fegt sofort alle Hindernisse vom Bildschirm. Notbremse für brenzlige Momente.', cefLife:'❤️ Leben', cefLifed:'Ohne Schild kostet ein Treffer ein Leben & setzt die Combo zurück. Bei 0 ist Schluss – sammle Extra-Herzen!', researchDone:'🔬 ERFORSCHT', ceElite:'🛡️ Panzer-Gegner', ceEliteD:'Zäh & CC-resistent – einfrieren bringt kaum was. Er lehnt sich auf deine Position zu: ausweichen & fokussiert wegballern.', ceFlank:'🔻 Flanker', ceFlankD:'Schnell & zielsuchend – jagt deine Spalte. Wenig HP: schnell wegballern oder seitlich ausweichen.', ceShield:'🛡️ Schild-Gegner', ceShieldD:'Sein Frontschild schluckt direkte Bolzen. Nutze AoE/Elemente (Nova, Kette, Brand, Stoß-Landung) – die umgehen das Schild!', ceShooter:'🦑 Schütze', ceShooterD:'Manche Viecher feuern vereinzelt ein langsames Geschoss auf dich – kurz rotes Aufleuchten als Warnung. Wegschießen oder ausweichen.',
      near:['KNAPP!','lowkey close','W ausweichen','ZACK!','fr fr','skill 🔥','HUI!'],
      combo:{3:'W COMBO',5:'GOATED 🐐',8:'SIGMA 🗿',12:'+1000 AURA',16:'GÖTTLICH fr',20:'NO CAP 🔥',24:'CYBER-GOD'},
      quips:["Dein Pixel-Ich ist jetzt Teil des Bodenbelags.","Tod durch Quadrat. Wie würdevoll.","Die gute Nachricht: Es tat nur einen Frame lang weh.","R.I.P. – Rendered In Pieces.","Selbst das Tutorial weint gerade.","Reflexe wie ein Faultier im Winterschlaf.","Glückwunsch! Du hast den Boden gefunden.","Die Synthwave-Götter schütteln den Kopf.","Du hattest EINE Aufgabe.","Statistisch gesehen: peinlich.","Organspende war gestern. Heute: Pixelspende.","Der Block kam aus dem Nichts. Dein Talent auch.","Game Over. Aber immerhin stilvoll explodiert."],
      insults:["Schwach. Richtig schwach.","Loser-Alarm. 🚨","Meine Oma weicht besser aus.","Git gud, sagt man da.","Setzen. Sechs.","skill issue tbh.","−1000 Aura, digga.","mid. einfach mid.","War das Absicht? Bitte sag ja.","0 rizz, 0 skill.","Selbst die Bots lachen.","NPC-Tod erkannt."],
      dumb:["bro hat einfach... ja.","das ist lowkey mid","real ones wissen Bescheid","kein Cap fr fr","gönn dir, digga","sigma move 🗿","valid. einfach valid.","slay 💅","based ngl","das ribbelt im Hirn","ist das Aura oder Lag?","kein Plan was hier abgeht","Hä? auch egal."],
      crazy:["weiche aus · sammle · überlebe","probier nicht zu sterben (du wirst)","100% chiptune, 0% gnade","heute schon explodiert?","no cap, das wird mid","reflexe verkauft? hier zurückholen"]
    },
    en:{
      tag:'Every sitting a highscore', daily:'🗓 DAILY CHALLENGE', playBtn:'▶ START GAME', workshop:'WORKSHOP', settings:'⚙️ SETTINGS',
      howTitle:'READY?', howGo:'GO!', howDodge:'Dodge & keep moving', howDodgeD:'Coins, combos & everything else explain themselves as you play. 🎮',
      tipSP:'💠 Skill point!', tipSPd:'Open the Workshop 🛠️ below to gear up', tipSyn:'🔗 Fusion ready!', tipSynd:'Workshop → “Synergies”: fuse two weapons', tipNear:'✦ Close!', tipNeard:'Near-miss = combo & more coins', tipCurse:'🎲 Curse', tipCursed:'Risky, more points – wears off', coach_move:'🕹️ Move', coach_moved:'Your glowing core follows your mouse or finger. Steer it calmly through the gaps between obstacles.', coach_near:'✦ Near-Miss', coach_neard:'Skim right past enemies = your combo climbs & more coins drop. Risk pays off!', coach_combo:'🔥 Combo Multiplier', coach_combod:'Every 4th combo step raises your score multiplier. Keep moving – one hit resets it.', coach_beat:'🎵 On Beat', coach_beatd:'Dodge right on the music’s beat → "ON BEAT!": bonus combo, more points and faster HYPE.', coach_coin:'🪙 Coins', coach_coind:'Coins are your currency. In the Workshop 🛠️ you buy permanent upgrades – even between runs.', coach_jump:'🦘 Jump', coach_jumpd:'Tap your ship → leap over danger and escape. It recharges automatically afterwards.', coach_hype:'🌈 HYPE Meter', coach_hyped:'Near-misses fill the bar up top. When full → HYPE: score ×2, coin magnet & rainbow trail.', coach_letter:'🔤 BONUS', coach_letterd:'Collect the letters in order. Complete the word = big bonus reward!', coach_sp:'💠 Skill Point', coach_spd:'Open the Workshop 🛠️ below and unlock new weapons & powers in the skill tree.', coach_shield:'🛡️ Shield', coach_shieldd:'The ring around your ship blocks exactly one hit. Then it’s gone – grab more.', coach_syn:'🔗 Synergy', coach_synd:'Fuse two weapons in the Workshop → new effect + OVERLOAD. Give it a try!', coach_loot:'✦ Relics', coach_lootd:'Smashed enemies drop ✦ relics. Grab them = instantly stronger (damage, crit, coins …). Rarer color = bigger boost.', coach_wcrate:'🔫 Arsenal Crate', coach_wcrated:'Square crates drop weapons. Free slot → a new weapon for free (even unpurchased ones!). Otherwise a skill point.', coach_chest:'📦 Loot Vault', coach_chestd:'The golden vault drifts across the field. Risk the trip → opening it bursts a loot explosion + coins.',
      how:'Mouse or <b>finger</b> · barely dodge = <b>near-miss bonus</b> · grab 🛡 · <b>ESC</b> = menu', install:'📲 Install app',
      ios:'On iPhone: tap the <b>Share</b> icon → <b>"Add to Home Screen"</b> – then THRONERUSH runs fullscreen.',
      m_normal:'ARCADE', m_normalD:'Levels, new shapes, boss waves, upgrade cards & power-ups. The full ride.',
      m_hard:'BLITZ', m_hardD:'Brutally fast, no breathers. Only guts, near-misses & power-ups save you.',
      m_zen:'ZEN', m_zenD:'No death. A hit only costs your combo. Chill, collect, chase the highscore.', mfeat_normal:'📈 Levels|👾 Bosses|🃏 Upgrades', mfeat_hard:'⚡ Fast|🎯 Near-Miss|🔥 Brutal', mfeat_zen:'♾️ No death|🌊 Chill|🏆 Highscore',
      pause:'PAUSE', resume:'▶ RESUME', mainmenu:'☰ MAIN MENU', chooseUp:'CHOOSE UPGRADE', arsenal:'🔫 ARSENAL', level:'Level',
      newWeapon:'NEW WEAPON', path:'PATH', ckLblW:'Weapons', ckLblS:'Synergies', ckLblV:'Life', slotsLbl:'Slots', synTitle:'Synergies', noSyn:'— none yet —', drop:'drop', lockedW:'🔒 Workshop', equipHint:'Tap to equip / unequip', arsenalTitle:'🛠️ WORKSHOP', hangar:'🛠️ WORKSHOP', arsenalTab:'Loadout', tabUpgrades:'Upgrades', freeSlot:'free', arsenalBtn:'🛠️ WORKSHOP', synUnlocked:'SYNERGY!', legChosen:'chosen', legAvail:'available', legLocked:'locked', forkLocked:'🔒 Unlock in the Workshop', blueprint:'Blueprint', startWeapon:'Starter weapon', forkTier:'Fork tier', cat_weapons:'Weapons', cat_ship:'Ship', cat_power:'Power', cat_economy:'Economy', cat_cosmetic:'Cosmetic', cat_synergy:'Synergies', treeHint:'Paths are chosen on level-up', hangarHint:'Tap a node/weapon to buy', addWeapon:'Get weapon', skillPts:'skill points',spStart:'starter bonus',buySP:'Buy skill point',needSP:'No skill points',needSPsub:'Beat bosses & grab drops',needChips:'Not enough chips',spDrop:'Boss loot!',statusTitle:'📊 COMBAT DOSSIER',statusBtn:'Ship status',statDps:'Avg damage/s',statCrit:'Crit chance',statCritDmg:'Crit power',statLives:'Lives',statShield:'Shield',statLuck:'Luck',statScore:'Score boost',statCoin:'Coin boost',statHull:'Hitbox',statReach:'Pickup range',statJump:'Jumps',statOC:'Overcharge',statTempo:'Fire rate',statFirepower:'Firepower split',statNoWep:'No weapons equipped.',statEst:'estimated', overchargeName:'Overcharge', fxSlow:'Slow-Mo', diffRating:'Challenge', diffSpeed:'Speed', diffArmor:'Enemy HP', diffCoins:'Coins', hiscores:'High Scores', lbTitle:'🏆 LEADERBOARD', lbBtn:'🏆 LEADERBOARD', lbView:'🏆 Leaderboard', lbSave:'🏆 SAVE SCORE', lbSaving:'Saving…', lbSaved:'✓ SAVED', lbBack:'← BACK', lbYourRank:'Your rank', lbEmpty:'No entries yet – be the first! 🚀', lbLoading:'Loading…', lbError:'Leaderboard unreachable right now', lbOff:'Leaderboard offline', lbNetErr:'Save failed – try again later', lbDailyTab:'🗓 Daily', lbSubmitBest:'Submit my record', nickTitle:'YOUR NAME', nickHint:'Your display name for the leaderboard (max 16 chars). You choose it.', nickPh:'Player name', nickSave:'SAVE', nickCancel:'CANCEL',fxMagnet:'Magnet', fxDouble:'×2 Score & Coins', fxMirror:'Mirrored', curseOver:'over!', fxMirrorSoon:'Mirror soon', fxMirOn:'MIRRORED!', fxMirOff:'normal', overchargeHint:'or pick a path below', damage:'damage', skillHint:'💠 Tap a node to unlock', skillNext:'▶ CONTINUE', synOn:'active', synNeed:'need', synPick:'activate', synFull:'slots full', synHint:'Buy fusions → combine freely up to the slot limit. Kills charge the OVERLOAD – tap it in the cockpit (keys 1–4) to unleash both weapons\u2019 skills!', ultReady:'OVERLOAD ready!', nextUp:'Next upgrade:', affordable:'affordable!', toGo:'to go', reached:'Reached:', bosses:'bosses', kitSave:'Save start loadout', kitActive:'Start loadout saved', kitHint:'These weapons auto-equip at the start of each run (costs 1 skill point each).', msPts:'points', msWin:'Beat the game', msReached:'MILESTONE!', msTitle:'🎯 MILESTONES', contTitle:'ONE MORE?', contSub:'Sweep the screen clean and keep going – each revive costs a bit more.', reviveBtn:'CONTINUE', reviveBuy:'GET COINS 🛒', giveup:'GIVE UP', reviveBanner:'REVIVED!', continueRun:'CONTINUE', jumpTxt:'HOP!', jumpHint:'JUMP CHARGED!', jumpHint2:'Tap your ship → leap over danger', loreTitle:'📖 STORY', loreLocked:'Not discovered yet – keep playing.', megaAtk:'MEGA ATTACK!', loreNext:'TAP TO CONTINUE ▶', clutch:'CLUTCH', clutchSub:'Slipped right through!', stomp:'SMASH!', shareCleared:'BEATEN!', shareGoal:'to the final boss', signature:'Signature move', bossStun:'💫 STUNNED!', ranks:['Rookie','Pixel Pilot','Drift Kid','Neon Knight','Combo Chef','Synthwave Ace','Vaporlord','Throne God'], rankLbl:'Rank', promo:'⭐ PROMOTED', bonusWord:'BONUS', bonusDone:'BONUS COMPLETE!', bonusSub:'Loot secured! 🪙', onBeat:'ON BEAT!', breather:'BREATHE', brCoins:'Coin rain! 🪙', brGift:'Little gift 🎁', brSlow:'Slow-mo ✨', hype:'HYPE', hypeTtl:'🌈 HYPE!', hypeSub:'Score ×2 & coin magnet!', hypeEnd:'Hype over', multikill:'MULTIKILL', missionsTitle:'🎯 RUN MISSIONS', missionDone:'MISSION ✓', msn_near:'%n near-misses', msn_combo:'Combo ×%n', msn_boss:'Defeat %n boss', msn_level:'Reach level %n', msn_perfect:'%n perfect dodges', msn_jump:'%n jumps', msn_onbeat:'%n× on beat', msn_beute:'Collect %w %n×', recoTitle:'⭐ Best next upgrades', loot_common:'Common', loot_magic:'Magic', loot_rare:'Rare', loot_epic:'Epic', aff_dmg:'damage', aff_rate:'fire rate', aff_crit:'crit', aff_score:'score', aff_coin:'coin value', aff_magnet:'magnet', aff_near:'near-miss', aff_hull:'smaller hitbox', aff_life:'+1 life', aff_shield:'+1 shield', aff_combo:'+1 combo anchor', aff_jump:'+1 jump', lootWeapon:'New weapon', lootCrate:'Arsenal crate', chestOpen:'VAULT LOOTED!', lootDiscover:'Newly discovered!', findFirst:'Find it in-game first', discovered:'Discovered – upgrade with coins',
      balance:'Balance', shopHint:'saved permanently · ever pricier & crazier', iapSoon:'Purchases are only available in the Play Store app.', iapNoSvc:'Play payment service not connected – open the Play Store and try again.', back:'← BACK', reallyQ:'SURE? ✓ (tap)', resetTitle:'RESET DATA', rs_workshop:'🛠️ Arsenal & Workshop (weapons, upgrades, chips, skill points)', rs_scores:'🏆 High scores', rs_achskins:'🏅 Achievements & skins', rs_coach:'📚 Tutorial / discovery codex', rs_all:'⚠️ DELETE EVERYTHING', rsDone:'✓ RESET',
      setTitle:'SETTINGS', tapToggle:'Tap to toggle', optMusic:'🎵 Music', optSfx:'🔊 Game Sound', optFull:'⛶ Fullscreen', coins:'Coins', coinBalLbl:'Balance', coinSoon:'Purchases coming soon', devHint:'Redeem dev/tester code', redeem:'REDEEM', devBad:'Invalid code', devPlace:'e.g. dev1000', optShake:'📳 Screenshake & rumble', optFx:'Screen effects', optCurses:'🎲 Funny curses', optGuns:'🔫 Shooting / weapons', optDmg:'🔢 Damage numbers', optMadness:'☣ Madness effects', optTelemetry:'📊 Anonymous stats', tlmcTitle:'Help improve the game?', tlmcBody:'After each run THRONERUSH can send a few <b>anonymous</b> values (level, score, weapons …) so we can improve the balancing. <b>No account, no name, no IP, no ads.</b> You can change this anytime in the settings.', tlmcYes:'YES, SURE 📊', tlmcNo:'NO THANKS', tlmcFoot:'More in the privacy policy.', tlmExport:'📤 Export telemetry', tlmDone:'✓ Copied', tlmEmpty:'no data yet', optLang:'🌐 Language', advOpt:'Advanced',
      on:'ON', off:'OFF', reduced:'REDUCED', activated:'activated', loser:'LOSER', respec:'Reset skills', reskilled:'refunded', crash:'CRASH', points:'Score', record:'Best', newRec:'★ NEW RECORD ★', again:'AGAIN', share:'📤 SHARE', menu:'MENU', best:'BEST',
      lvl:'LEVEL', newForm:'New shape: ', faster:'Faster & denser!', bossWave:'⚠ BOSS WAVE ', megaBoss:'🛸 MEGA-BOSS', endgegner:'👾 THE FINAL BOSS', finaleSub:'survive the inferno!',
      survived:'SURVIVED!', defeated:'DEFEATED! 💥', escaped:'🛸 ESCAPED…', escapedSub:'the loot is gone!', bossEscaped:'🛸 BOSS ESCAPED!', lvlAgain:'Replay level', armUp:'Gear up for the boss · Level ',
      overdrive:'⚡ OVERDRIVE', overdriveSub:"you're on fire!", enrage:'🔥 ENRAGE!', enrageSub:'it totally loses it!',
      beaten:'🏆 YOU BEAT IT!', beatenSub:'…but it never stops.', madness:'☣ MADNESS MODE', madnessSub:'how far can you go?', clearedTag:'🏆 BEATEN!  ·  ',
      shieldGone:'SHIELD GONE!', comboGoneZ:'COMBO LOST', lifeLost:'−1 ♥', livesLeft:' ♥ LEFT', comboOut:'COMBO OUT', perfect:'PERFECT! 🎯', daily2:'🗓 DAILY',
      pSchild:'SHIELD', pSlow:'SLOW-MO', pMagnet:'MAGNET', pDouble:'✕2 SCORE & 🪙', pBomb:'BOMB', boom:'BOOM!', boomSub:' vaporized', curseTag:'🎲 CURSE',
      shareScore:' points! Beat me 🔥 ', beatMe:'BEAT ME. 🔥', pointsBig:'POINTS', dailyLbl:'DAILY', modeDaily:'DAILY',
      achBtn:'🏅 ACHIEVEMENTS', shipDesigner:'Ship Designer', il_ach:'Awards', il_lb:'Top', il_status:'Status', il_ship:'Ship', il_coin:'Coins', il_set:'Setup', achTitle:'ACHIEVEMENTS', achGot:'🏅 ACHIEVEMENT', locked:'locked', active:'ACTIVE', choose:'SELECT', customShip:'Custom Ship', newShip:'New Ship', del:'Delete', shipDefault:'Ship', design:'Design', edit:'Edit', pixels:'Pixels', templates:'Templates', glowUnlock:'Unlock glow', codexTitle:'📚 DISCOVERED', codexLocked:'Not discovered yet – keep playing.', cefCrit:'🎯 Critical Hit', cefCritd:'Some shots are crits – double (red) damage. Raise your crit chance with upgrades.', cefMag:'🧲 Magnet', cefMagd:'Pulls all coins to you for a short while. Just keep dodging – collecting is automatic.', cefSlow:'⏱ Slow-Mo', cefSlowd:'Briefly slows the whole world – perfect for weaving out of tight spots.', cefDbl:'✕2 Points', cefDbld:'For a short time points AND coins count double. Taking risks really pays off now!', cefBomb:'💣 Bomb', cefBombd:'Instantly clears all obstacles off the screen. An emergency brake for hairy moments.', cefLife:'❤️ Lives', cefLifed:'Without a shield a hit costs a life & resets your combo. At 0 it’s over – collect extra hearts!', researchDone:'🔬 RESEARCHED', ceElite:'🛡️ Tank', ceEliteD:'Tough & CC-resistant – freezing barely works. It leans toward you: dodge & focus it down.', ceFlank:'🔻 Flanker', ceFlankD:'Fast & homing – hunts your column. Low HP: shoot it fast or dodge sideways.', ceShield:'🛡️ Shield Foe', ceShieldD:'Its front shield eats direct bolts. Use AoE/elements (nova, chain, burn, stomp) – they bypass the shield!', ceShooter:'🦑 Shooter', ceShooterD:'Some critters occasionally fire a slow shot at you – a brief red glow warns you. Shoot them down or dodge.',
      near:['CLOSE!','lowkey close','clean dodge','ZOOM!','fr fr','skill 🔥','WHEW!'],
      combo:{3:'W COMBO',5:'GOATED 🐐',8:'SIGMA 🗿',12:'+1000 AURA',16:'GODLIKE fr',20:'NO CAP 🔥',24:'CYBER-GOD'},
      quips:["Your pixel self is now part of the flooring.","Death by square. How dignified.","Good news: it only hurt for one frame.","R.I.P. – Rendered In Pieces.","Even the tutorial is crying.","Reflexes like a sloth on melatonin.","Congrats! You found the floor.","The synthwave gods shake their heads.","You had ONE job.","Statistically speaking: embarrassing."],
      insults:["Weak. Real weak.","Loser alert. 🚨","My grandma dodges better.","Git gud, they say.","Sit down. Zero.","skill issue tbh.","−1000 aura, bro.","mid. just mid.","sit down, bro.","0 rizz, 0 skill.","ratio. L. cope.","NPC death detected."],
      dumb:["bro just... yeah.","this is lowkey mid","real ones know","no cap fr fr","treat yourself, bro","sigma move 🗿","valid. just valid.","slay 💅","based ngl","that's brain-tingling","aura or just lag?","no clue what's happening","huh? whatever."],
      crazy:["dodge · collect · survive","try not to die (you will)","100% chiptune, 0% mercy","exploded yet today?","no cap, this'll be mid","sold your reflexes? get 'em back here"]
    },
    fr:{
      tag:'Chaque séance un highscore', daily:'🗓 DÉFI DU JOUR', playBtn:'▶ JOUER', workshop:'ATELIER', settings:'⚙️ RÉGLAGES',
      howTitle:'PRÊT ?', howGo:'C’EST PARTI !', howDodge:'Esquive & reste mobile', howDodgeD:'Pièces, combos & le reste s’expliquent tout seuls en jouant. 🎮',
      tipSP:'💠 Point de skill !', tipSPd:'Ouvre l’Atelier 🛠️ en bas pour t’équiper', tipSyn:'🔗 Fusion possible !', tipSynd:'Atelier → « Synergies » : fusionne deux armes', tipNear:'✦ Juste !', tipNeard:'Near-miss = combo & plus de coins', tipCurse:'🎲 Malédiction', tipCursed:'Risqué, plus de points – temporaire', coach_move:'🕹️ Bouger', coach_moved:'Ton noyau lumineux suit la souris ou le doigt. Faufile-le tranquillement dans les trous entre les obstacles.', coach_near:'✦ Near-Miss', coach_neard:'Frôle les ennemis = ton combo grimpe & plus de pièces tombent. Le risque paie !', coach_combo:'🔥 Multiplicateur', coach_combod:'Chaque 4e palier de combo augmente ton multiplicateur. Reste mobile – un coup le remet à zéro.', coach_beat:'🎵 Dans le rythme', coach_beatd:'Esquive pile sur le beat → « EN RYTHME » : combo bonus, plus de points et HYPE plus vite.', coach_coin:'🪙 Pièces', coach_coind:'Les pièces sont ta monnaie. À l’Atelier 🛠️ tu achètes des améliorations permanentes – même entre les parties.', coach_jump:'🦘 Saut', coach_jumpd:'Touche ton vaisseau → saute par-dessus le danger et échappe-toi. Il se recharge ensuite tout seul.', coach_hype:'🌈 Jauge HYPE', coach_hyped:'Les near-miss remplissent la barre en haut. Pleine → HYPE : score ×2, aimant à pièces & traînée arc-en-ciel.', coach_letter:'🔤 BUTIN', coach_letterd:'Ramasse les lettres dans l’ordre. Mot complet = grosse récompense !', coach_sp:'💠 Point de skill', coach_spd:'Ouvre l’Atelier 🛠️ en bas et débloque de nouvelles armes & pouvoirs dans l’arbre.', coach_shield:'🛡️ Bouclier', coach_shieldd:'L’anneau autour de ton vaisseau bloque un seul coup. Ensuite il disparaît – reprends-en.', coach_syn:'🔗 Synergie', coach_synd:'Fusionne deux armes à l’Atelier → nouvel effet + SURCHARGE. Essaie !', coach_loot:'✦ Reliques', coach_lootd:'Les ennemis détruits lâchent des reliques ✦. Les ramasser = plus fort direct (dégâts, crit, pièces …). Couleur plus rare = boost plus gros.', coach_wcrate:'🔫 Caisse d’arsenal', coach_wcrated:'Les caisses carrées lâchent des armes. Slot libre → une nouvelle arme gratuite (même non achetée !). Sinon un point de skill.', coach_chest:'📦 Coffre à butin', coach_chestd:'Le coffre doré dérive sur le terrain. Risque le trajet → l’ouvrir déclenche une explosion de butin + des pièces.',
      how:'Souris ou <b>doigt</b> · frôler = <b>bonus near-miss</b> · choper 🛡 · <b>ESC</b> = menu', install:'📲 Installer l’appli',
      ios:'Sur iPhone : touche l’icône <b>Partager</b> → <b>« Sur l’écran d’accueil »</b> – THRONERUSH passe en plein écran.',
      m_normal:'ARCADE', m_normalD:'Niveaux, nouvelles formes, vagues de boss, cartes d’amélioration & power-ups. Le pack complet.',
      m_hard:'BLITZ', m_hardD:'Ultra rapide, sans répit. Seuls le cran, les near-miss & power-ups te sauvent.',
      m_zen:'ZEN', m_zenD:'Pas de mort. Un coup coûte juste ton combo. Chill, collecte, vise le highscore.', mfeat_normal:'📈 Niveaux|👾 Boss|🃏 Améliorations', mfeat_hard:'⚡ Rapide|🎯 Near-Miss|🔥 Brutal', mfeat_zen:'♾️ Sans mort|🌊 Détente|🏆 Score',
      pause:'PAUSE', resume:'▶ REPRENDRE', mainmenu:'☰ MENU', chooseUp:'CHOISIS UNE AMÉLIORATION', arsenal:'🔫 ARSENAL', level:'Niveau',
      newWeapon:'NOUVELLE ARME', path:'VOIE', ckLblW:'Armes', ckLblS:'Synergies', ckLblV:'Vies', slotsLbl:'Slots', synTitle:'Synergies', noSyn:'— aucune —', drop:'retirer', lockedW:'🔒 Atelier', equipHint:'Touchez pour équiper/retirer', arsenalTitle:'🛠️ ATELIER', hangar:'🛠️ ATELIER', arsenalTab:'Loadout', tabUpgrades:'Améliorations', freeSlot:'libre', arsenalBtn:'🛠️ ATELIER', synUnlocked:'SYNERGIE !', legChosen:'choisi', legAvail:'disponible', legLocked:'verrouillé', forkLocked:'🔒 Débloquer à l’Atelier', blueprint:'Plan', startWeapon:'Arme de base', forkTier:'Palier', cat_weapons:'Armes', cat_ship:'Vaisseau', cat_power:'Puissance', cat_economy:'Économie', cat_cosmetic:'Cosmétique', cat_synergy:'Synergies', treeHint:'Les voies se choisissent au level-up', hangarHint:'Touchez un nœud/arme pour acheter', addWeapon:'Prendre arme', skillPts:'points',spStart:'bonus de départ',buySP:'Acheter un point',needSP:'Aucun point',needSPsub:'Battez des boss & ramassez',needChips:'Pas assez de chips',spDrop:'Butin de boss !',statusTitle:'📊 FICHE DE COMBAT',statusBtn:'Statut du vaisseau',statDps:'Dégâts/s moy.',statCrit:'Chance crit',statCritDmg:'Force crit',statLives:'Vies',statShield:'Bouclier',statLuck:'Chance',statScore:'Bonus points',statCoin:'Bonus coins',statHull:'Hitbox',statReach:'Rayon de collecte',statJump:'Sauts',statOC:'Renfort',statTempo:'Cadence',statFirepower:'Répartition puissance',statNoWep:'Aucune arme équipée.',statEst:'estimé', overchargeName:'Surcharge', fxSlow:'Ralenti', diffRating:'Défi', diffSpeed:'Vitesse', diffArmor:'PV ennemis', diffCoins:'Pièces', hiscores:'Meilleurs scores', lbTitle:'🏆 CLASSEMENT', lbBtn:'🏆 CLASSEMENT', lbView:'🏆 Classement', lbSave:'🏆 ENREGISTRER', lbSaving:'Enregistre…', lbSaved:'✓ ENREGISTRÉ', lbBack:'← RETOUR', lbYourRank:'Ton rang', lbEmpty:'Aucune entrée – sois le premier ! 🚀', lbLoading:'Chargement…', lbError:'Classement indisponible', lbOff:'Classement hors-ligne', lbNetErr:'Échec – réessaie plus tard', lbDailyTab:'🗓 Quotidien', lbSubmitBest:'Soumettre mon record', nickTitle:'TON NOM', nickHint:'Ton nom pour le classement (max 16 caractères). Tu le choisis.', nickPh:'Nom du joueur', nickSave:'ENREGISTRER', nickCancel:'ANNULER', fxMagnet:'Aimant', fxDouble:'×2 Score & Pièces', fxMirror:'Inversé', curseOver:'fini !', fxMirrorSoon:'Inversion proche', fxMirOn:'INVERSÉ!', fxMirOff:'normal', overchargeHint:'ou choisis une voie', damage:'dégâts', skillHint:'💠 Touchez un nœud pour débloquer', skillNext:'▶ CONTINUER', synOn:'actif', synNeed:'manque', synPick:'activer', synFull:'slots pleins', synHint:'Achetez des fusions → combinez librement jusqu\u2019à la limite. Les kills chargent la SURCHARGE – touchez-la dans le cockpit (touches 1–4) !', ultReady:'SURCHARGE prête !', nextUp:'Prochain bonus :', affordable:'disponible !', toGo:'restants', reached:'Atteint :', bosses:'boss', kitSave:'Loadout de départ', kitActive:'Loadout de départ actif', kitHint:'Ces armes sont équipées au début de chaque partie (coûte 1 point chacune).', msPts:'points', msWin:'Terminer le jeu', msReached:'JALON !', msTitle:'🎯 JALONS', contTitle:'ENCORE ?', contSub:'On nettoie l’écran et on repart – chaque relance coûte un peu plus.', reviveBtn:'CONTINUER', reviveBuy:'OBTENIR DES PIÈCES 🛒', giveup:'ABANDONNER', reviveBanner:'RANIMÉ !', continueRun:'REPRENDRE', jumpTxt:'HOP !', jumpHint:'SAUT CHARGÉ !', jumpHint2:'Touche ton vaisseau → saute par-dessus le danger', loreTitle:'📖 HISTOIRE', loreLocked:'Pas encore découvert – continue.', megaAtk:'MÉGA-ATTAQUE !', loreNext:'TOUCHER POUR CONTINUER ▶', clutch:'CLUTCH', clutchSub:'Passé au millimètre !', stomp:'BAM !', shareCleared:'TERMINÉ !', shareGoal:'jusqu’au boss final', signature:'Move signature', bossStun:'💫 ÉTOURDI !', ranks:['Bleu','Pilote Pixel','Drift Kid','Chevalier Néon','Chef Combo','As Synthwave','Vaporlord','Dieu du Trône'], rankLbl:'Grade', promo:'⭐ PROMU', bonusWord:'BUTIN', bonusDone:'BUTIN COMPLET !', bonusSub:'Butin empoché ! 🪙', onBeat:'EN RYTHME !', breather:'RESPIRE', brCoins:'Pluie de pièces ! 🪙', brGift:'Petit cadeau 🎁', brSlow:'Ralenti ✨', hype:'HYPE', hypeTtl:'🌈 HYPE!', hypeSub:'Score ×2 & aimant à pièces !', hypeEnd:'Hype fini', multikill:'MULTIKILL', missionsTitle:'🎯 MISSIONS', missionDone:'MISSION ✓', msn_near:'%n near-miss', msn_combo:'Combo ×%n', msn_boss:'Battre %n boss', msn_level:'Niveau %n atteint', msn_perfect:'%n esquives parfaites', msn_jump:'%n sauts', msn_onbeat:'%n× dans le rythme', msn_beute:'Collecter %w %n×', recoTitle:'⭐ Meilleurs upgrades', loot_common:'Commun', loot_magic:'Magique', loot_rare:'Rare', loot_epic:'Épique', aff_dmg:'dégâts', aff_rate:'cadence', aff_crit:'crit', aff_score:'score', aff_coin:'valeur pièces', aff_magnet:'aimant', aff_near:'near-miss', aff_hull:'hitbox réduite', aff_life:'+1 vie', aff_shield:'+1 bouclier', aff_combo:'+1 ancre combo', aff_jump:'+1 saut', lootWeapon:'Nouvelle arme', lootCrate:'Caisse d’arsenal', chestOpen:'COFFRE PILLÉ !', lootDiscover:'Nouvelle découverte !', findFirst:'À trouver en jeu d’abord', discovered:'Découverte – améliorable avec des pièces',
      balance:'Solde', shopHint:'sauvegardé · toujours plus cher & plus fou', iapSoon:'Achats disponibles uniquement dans l’app Play Store.', iapNoSvc:'Service de paiement Play non connecté – ouvre le Play Store et réessaie.', back:'← RETOUR', reallyQ:'SÛR ? ✓ (touche)', resetTitle:'RÉINITIALISER', rs_workshop:'🛠️ Arsenal & Atelier (armes, upgrades, chips, points)', rs_scores:'🏆 Scores', rs_achskins:'🏅 Succès & skins', rs_coach:'📚 Tutoriel / codex de découverte', rs_all:'⚠️ TOUT EFFACER', rsDone:'✓ OK',
      setTitle:'RÉGLAGES', tapToggle:'Touche pour changer', optMusic:'🎵 Musique', optSfx:'🔊 Sons du jeu', optFull:'⛶ Plein écran', coins:'Coins', coinBalLbl:'Solde', coinSoon:'Achats bientôt disponibles', devHint:'Saisir un code dev/testeur', redeem:'VALIDER', devBad:'Code invalide', devPlace:'p. ex. dev1000', optShake:'📳 Tremblement & vibration', optFx:'Effets d’écran', optCurses:'🎲 Malédictions fun', optGuns:'🔫 Tir / armes', optDmg:'🔢 Chiffres de dégâts', optMadness:'☣ Effets folie', optTelemetry:'📊 Stats anonymes', tlmcTitle:'Aider à améliorer le jeu ?', tlmcBody:'Après chaque partie, THRONERUSH peut envoyer quelques valeurs <b>anonymes</b> (niveau, score, armes …) pour améliorer l’équilibrage. <b>Aucun compte, aucun nom, aucune IP, aucune pub.</b> Modifiable à tout moment dans les réglages.', tlmcYes:'OUI, AVEC PLAISIR 📊', tlmcNo:'NON MERCI', tlmcFoot:'Plus d’infos dans la politique de confidentialité.', tlmExport:'📤 Exporter télémétrie', tlmDone:'✓ Copié', tlmEmpty:'aucune donnée', optLang:'🌐 Langue', advOpt:'Avancé',
      on:'OUI', off:'NON', reduced:'RÉDUIT', activated:'activé', loser:'LOSER', respec:'Réinitialiser', reskilled:'remboursé', crash:'CRASH', points:'Score', record:'Record', newRec:'★ NOUVEAU RECORD ★', again:'REJOUER', share:'📤 PARTAGER', menu:'MENU', best:'BEST',
      lvl:'NIVEAU', newForm:'Nouvelle forme : ', faster:'Plus vite & plus dense !', bossWave:'⚠ VAGUE DE BOSS ', megaBoss:'🛸 MÉGA-BOSS', endgegner:'👾 LE BOSS FINAL', finaleSub:'survis à l’enfer !',
      survived:'SURVÉCU !', defeated:'VAINCU ! 💥', escaped:'🛸 ENFUI…', escapedSub:'le butin s’envole !', bossEscaped:'🛸 BOSS ENFUI !', lvlAgain:'Niveau à refaire :', armUp:'Équipe-toi pour le boss · Niveau ',
      overdrive:'⚡ OVERDRIVE', overdriveSub:'tu es en feu !', enrage:'🔥 ENRAGE !', enrageSub:'il pète un câble !',
      beaten:'🏆 TERMINÉ !', beatenSub:'…mais ça ne s’arrête pas.', madness:'☣ MODE FOLIE', madnessSub:'jusqu’où iras-tu ?', clearedTag:'🏆 TERMINÉ !  ·  ',
      shieldGone:'BOUCLIER PERDU !', comboGoneZ:'COMBO PERDU', lifeLost:'−1 ♥', livesLeft:' ♥ RESTANT', comboOut:'COMBO FINI', perfect:'PARFAIT ! 🎯', daily2:'🗓 DAILY',
      pSchild:'BOUCLIER', pSlow:'RALENTI', pMagnet:'AIMANT', pDouble:'✕2 SCORE & 🪙', pBomb:'BOMBE', boom:'BOUM !', boomSub:' pulvérisés', curseTag:'🎲 MALÉDICTION',
      shareScore:' points ! Bats-moi 🔥 ', beatMe:'BATS-MOI. 🔥', pointsBig:'POINTS', dailyLbl:'DAILY', modeDaily:'DAILY',
      achBtn:'🏅 SUCCÈS', shipDesigner:'Designer de vaisseau', il_ach:'Succès', il_lb:'Top', il_status:'Statut', il_ship:'Skin', il_coin:'Coins', il_set:'Réglages', achTitle:'SUCCÈS', achGot:'🏅 SUCCÈS', locked:'verrouillé', active:'ACTIF', choose:'CHOISIR', customShip:'Vaisseau perso', newShip:'Nouveau', del:'Supprimer', shipDefault:'Vaisseau', design:'Créer', edit:'Modifier', pixels:'Pixels', templates:'Modèles', glowUnlock:'Débloquer glow', codexTitle:'📚 DÉCOUVERT', codexLocked:'Pas encore découvert – continue.', cefCrit:'🎯 Coup Critique', cefCritd:'Certains tirs sont des crits – dégâts doublés (rouge). Augmente ta chance de crit avec des upgrades.', cefMag:'🧲 Aimant', cefMagd:'Attire toutes les pièces vers toi un court instant. Continue d’esquiver – la collecte est automatique.', cefSlow:'⏱ Ralenti', cefSlowd:'Ralentit brièvement tout le monde – parfait pour se faufiler hors des situations serrées.', cefDbl:'✕2 Points', cefDbld:'Un court instant, points ET pièces comptent double. Prendre des risques paie vraiment !', cefBomb:'💣 Bombe', cefBombd:'Nettoie instantanément tous les obstacles. Un frein d’urgence pour les moments chauds.', cefLife:'❤️ Vies', cefLifed:'Sans bouclier, un coup coûte une vie & remet le combo à zéro. À 0 c’est fini – ramasse des cœurs !', researchDone:'🔬 RECHERCHÉ', ceElite:'🛡️ Tank', ceEliteD:'Coriace & résistant au CC – geler ne sert presque à rien. Il se penche vers toi : esquive et concentre le feu.', ceFlank:'🔻 Flanker', ceFlankD:'Rapide & à tête chercheuse – chasse ta colonne. Peu de PV : tire vite ou esquive sur le côté.', ceShield:'🛡️ Ennemi Bouclier', ceShieldD:'Son bouclier frontal absorbe les tirs directs. Utilise l’AoE/les éléments (nova, chaîne, feu, atterrissage) – ils contournent le bouclier !', ceShooter:'🦑 Tireur', ceShooterD:'Certaines bestioles tirent parfois un projectile lent sur toi – un bref éclat rouge te prévient. Détruis-les ou esquive.',
      near:['JUSTE !','presque touché','esquive propre','ZOU !','fr fr','skill 🔥','OUF !'],
      combo:{3:'W COMBO',5:'GOATED 🐐',8:'SIGMA 🗿',12:'+1000 AURA',16:'DIVIN fr',20:'NO CAP 🔥',24:'CYBER-DIEU'},
      quips:["Ton toi en pixels fait maintenant partie du sol.","Mort par carré. Quelle dignité.","Bonne nouvelle : ça n’a fait mal qu’une frame.","R.I.P. – Rendu En Pièces.","Même le tutoriel pleure.","Des réflexes de paresseux sous mélatonine.","Bravo ! Tu as trouvé le sol.","Les dieux de la synthwave secouent la tête.","Tu avais UNE mission.","Statistiquement : gênant."],
      insults:["Faible. Vraiment faible.","Alerte loser. 🚨","Ma mamie esquive mieux.","Git gud, qu’ils disent.","Assieds-toi. Zéro.","skill issue tbh.","−1000 d’aura, mec.","mid. juste mid.","assieds-toi, frère.","0 rizz, 0 skill.","ratio. L. cope.","mort de PNJ détectée."],
      dumb:["le frère a juste… ouais.","c’est lowkey mid","les vrais savent","no cap fr fr","fais-toi plaisir, mec","sigma move 🗿","valide. juste valide.","slay 💅","based ngl","ça gratte le cerveau","de l’aura ou juste du lag ?","aucune idée de ce qui se passe","hein ? peu importe."],
      crazy:["esquive · collecte · survis","essaie de pas mourir (tu vas mourir)","100% chiptune, 0% pitié","déjà explosé aujourd’hui ?","no cap, ça va être mid","tes réflexes vendus ? récupère-les ici"]
    }
  };
  // Upgrade-Karten- & Werkstatt-Übersetzungen [Name, Beschreibung]
  const UPTR={
    de:{radar:['Radar','Near-Miss-Radius +45%'],shieldgen:['Schildgenerator','+1 Schild & +1 pro Boss'],glass:['Glaskanone','+30% Punkte, +15% Hitbox'],nimble:['Flink','Reaktion schneller'],small:['Kompakt','Hitbox −18%'],orbval:['Münz-Veredelung','Münzen +60% Wert'],magnet:['Magnetfeld','Dauerhafter Münz-Sog'],loot:['Glücksbringer','Power-Up-Drop-Chance +50%'],combo:['Combo-Anker','+1 Combo je Near-Miss'],reflex:['Reflex-Kern','Slow-Mo +50% länger'],heart:['Extra-Herz','+1 Leben'],banana:['Bananen-Boden','Schiff rutscht & driftet, +65% Punkte'],smol:['Smol Brain','Hitbox +28% (stapelt), dafür +50% Punkte'],energy:['Energy-Drink-OD','Gegner +22% schnell, Radar +75%'],blind:['Drip aber blind','Sicht eng, +90% Punkte'],clown:['Clown-Modus','Mehr Gegner-Andrang, dafür Münzen ×2 Wert'],mirror:['Spiegelwelt','30s gespiegelte Steuerung, +55% Punkte'],blaster:['Blaster','Auto-Feuer · +Feuerrate'],twin:['Doppellauf','+1 Bolzen · je Bolzen schwächer'],power:['Schadenskern','+1 Schaden'],pierce:['Durchschlag','Bolzen durchschlägt +1'],missile:['Lenkraketen','Zielsuchend · Explosion (AoE)'],flame:['Brandbolzen','Entzündet Ziele (Brennschaden)'],frost:['Frostschuss','Vereist & verlangsamt Ziele'],chain:['Kettenblitz','Kill springt auf nahe Ziele'],amp:['Verstärker','+22% Schaden für ALLE Waffen'],tempo:['Taktung','ALLE Waffen feuern 14% schneller'],crit:['Zielfokus','+11% Krit-Chance (×2 Schaden)'],critdmg:['Wuchttreffer','Mehr Krit-Schaden (abflachend, rot)'],jumpcd:['Sprung-Kondensator','Sprung lädt 25% schneller'],jumpdouble:['Doppelsprung','+1 Sprung-Ladung (mehrfach springen)'],jumpstomp:['Stoß-Landung','Landung: Schockwelle räumt Hindernisse & Kugeln'],jumpphase:['Phasenflug','Sprung dauert länger & vaultet weiter'],jumpshock:['Schocklandung','Landung entlädt einen Kettenblitz – stärker mit Kette'],jumpfrost:['Frostlandung','Landung vereist Gegner ringsum – stärker mit Frost']},
    en:{radar:['Radar','Near-miss radius +45%'],shieldgen:['Shield Gen','+1 shield & +1 per boss'],glass:['Glass Cannon','+30% score, +15% hitbox'],nimble:['Nimble','Faster reaction'],small:['Compact','Hitbox −18%'],orbval:['Coin Refining','Coins +60% value'],magnet:['Magnet Field','Permanent coin pull'],loot:['Lucky Charm','Power-up drop chance +50%'],combo:['Combo Anchor','+1 combo per near-miss'],reflex:['Reflex Core','Slow-mo +50% longer'],heart:['Extra Heart','+1 life'],banana:['Banana Floor','Ship slides & drifts, +65% score'],smol:['Smol Brain','Hitbox +28% (stacks), +50% score'],energy:['Energy-Drink OD','Enemies +22% fast, radar +75%'],blind:['Drip but Blind','Limited view, +90% score'],clown:['Clown Mode','More enemy crowding, but coins ×2 value'],mirror:['Mirror World','30s flipped steering, +55% score'],blaster:['Blaster','Auto-fire · +fire rate'],twin:['Twin Barrel','+1 bolt · each bolt weaker'],power:['Damage Core','+1 damage'],pierce:['Piercing','Bolt pierces +1'],missile:['Homing Missiles','Seeking · explosion (AoE)'],flame:['Flame Bolts','Ignites targets (burn damage)'],frost:['Frost Shot','Freezes & slows targets'],chain:['Chain Lightning','Kills arc to nearby targets'],amp:['Amplifier','+22% damage for ALL weapons'],tempo:['Cadence','ALL weapons fire 14% faster'],crit:['Focus','+11% crit chance (×2 damage)'],critdmg:['Heavy Hit','More crit damage (diminishing)'],jumpcd:['Jump Capacitor','Jump recharges 25% faster'],jumpdouble:['Double Jump','+1 jump charge (multi-jump)'],jumpstomp:['Stomp Landing','Landing shockwave clears obstacles & bullets'],jumpphase:['Phase Flight','Longer jump & farther vault'],jumpshock:['Shock Landing','Landing arcs chain lightning – stronger with Chain'],jumpfrost:['Frost Landing','Landing freezes nearby foes – stronger with Frost']},
    fr:{radar:['Radar','Rayon near-miss +45%'],shieldgen:['Générateur','+1 bouclier & +1 par boss'],glass:['Canon de Verre','+30% score, +15% hitbox'],nimble:['Agile','Réaction plus vive'],small:['Compact','Hitbox −18%'],orbval:['Raffinage de Pièces','Pièces +60% valeur'],magnet:['Champ Magnétique','Attraction de pièces'],loot:['Porte-Bonheur','Chance de drop +50%'],combo:['Ancre Combo','+1 combo par near-miss'],reflex:['Noyau Réflexe','Ralenti +50% plus long'],heart:['Cœur Bonus','+1 vie'],banana:['Sol Banane','Vaisseau glisse & dérive, +65% score'],smol:['Smol Brain','Hitbox +28% (cumul), +50% score'],energy:['Energy-Drink OD','Ennemis +22% vite, radar +75%'],blind:['Drip mais Aveugle','Vue réduite, +90% score'],clown:['Mode Clown','Plus d’ennemis, mais pièces ×2 valeur'],mirror:['Monde Miroir','Pilotage inversé 30s, +55% score'],blaster:['Blaster','Tir auto · +cadence'],twin:['Double Canon','+1 projectile · chacun plus faible'],power:['Noyau de Dégâts','+1 dégât'],pierce:['Perforant','Le tir traverse +1'],missile:['Missiles Guidés','À tête chercheuse · explosion (AoE)'],flame:['Tirs Incendiaires','Enflamme les cibles (brûlure)'],frost:['Tir de Givre','Gèle et ralentit les cibles'],chain:['Éclair en Chaîne','Le kill rebondit sur les cibles'],amp:['Amplificateur','+22% dégâts pour TOUTES les armes'],tempo:['Cadence','TOUTES les armes tirent 14% plus vite'],crit:['Focalisation','+11% chance de critique (×2 dégâts)'],critdmg:['Coup Lourd','Plus de dégâts crit (dégressif)'],jumpcd:['Condensateur','Le saut recharge 25% plus vite'],jumpdouble:['Double Saut','+1 charge de saut'],jumpstomp:['Atterrissage Choc','Onde de choc : dégage obstacles & projectiles'],jumpphase:['Vol Spectral','Saut plus long & bond plus loin'],jumpshock:['Atterrissage Choc','L’atterrissage déclenche un éclair en chaîne – plus fort avec Chaîne'],jumpfrost:['Atterrissage Glacé','L’atterrissage gèle les ennemis autour – plus fort avec Givre']}
  };
  // Waffen (Basis), Skill-Pfade & Synergien – [Name, Beschreibung]
  const WTR={
    de:{blaster:['Blaster','Auto-Bolzen nach oben'],missile:['Lenkraketen','Zielsuchend · Explosion (AoE)'],flame:['Brandbolzen','Entzündet Ziele (Brennschaden)'],frost:['Frostschuss','Vereist & verlangsamt Ziele'],chain:['Kettenblitz','Zappt das nächste Ziel · Kette'],nova:['Nova-Puls','Schockwelle rundum (Nahbereich-AoE)'],rail:['Railgun','Sofort-Schiene · trifft die ganze Spalte']},
    en:{blaster:['Blaster','Auto-bolts upward'],missile:['Homing Missiles','Seeking · explosion (AoE)'],flame:['Flame Bolts','Ignites targets (burn)'],frost:['Frost Shot','Freezes & slows'],chain:['Chain Lightning','Zaps nearest target · chains'],nova:['Nova Pulse','Shockwave around you (close AoE)'],rail:['Railgun','Instant rail · hits the whole column']},
    fr:{blaster:['Blaster','Tirs auto vers le haut'],missile:['Missiles Guidés','À tête chercheuse · explosion'],flame:['Tirs Incendiaires','Enflamme (brûlure)'],frost:['Tir de Givre','Gèle et ralentit'],chain:['Éclair en Chaîne','Frappe la cible la plus proche · chaîne'],nova:['Pulsar Nova','Onde de choc autour de toi (AoE)'],rail:['Railgun','Rail instantané · toute la colonne']}
  };
  const PTR={
    de:{rapid:['Schnellfeuer','+50% Feuerrate, etwas weniger Schaden'],heavy:['Wuchtschuss','Langsamer, aber doppelter Schaden'],scatter:['Streuschuss','+2 Bolzen (Fächer), je schwächer'],precise:['Präzision','+2 Durchschlag, +40% Schaden'],swarm:['Schwarm','2 kleinere Raketen'],warhead:['Sprengkopf','1 große Rakete, +50% Radius'],shrapnel:['Splittergranate','Explosion schleudert Splitter'],incendiary:['Brandsatz','Explosion entzündet Ziele'],ember:['Glut','Über doppelter Brennschaden'],wildfire:['Flächenbrand','Feuer springt beim Tod über'],accel:['Brandbeschleuniger','Brennt schneller (kürzer, härter)'],consume:['Verzehr','Brand-Kills geben Bonuspunkte'],permafrost:['Permafrost','Längere & stärkere Verlangsamung'],glaciate:['Vereisung','Chance, Ziele komplett einzufrieren'],shatter:['Splitterbruch','Gefrorene Ziele zerspringen (AoE)'],brittle:['Spröde','Gefrorene Ziele nehmen +50% Schaden'],fork:['Überschlag','+3 Sprünge, weniger Schaden je Sprung'],highv:['Hochspannung','Weniger Sprünge, viel Schaden + Stun'],stormhit:['Gewitter','Kette auch bei Bolzen-Kills'],dischargeaoe:['Entladung','Jeder Kettentreffer mit kleinem AoE'],shock:['Schockwelle','+50% Puls-Radius'],overload:['Überladung','+90% Schaden, langsamer'],repel:['Abstoßung','Stößt getroffene Ziele zurück'],staticfield:['Statikfeld','Puls verlangsamt getroffene Ziele'],charged:['Aufgeladen','+100% Schaden, langsamer'],autoload:['Schnelllader','+70% Feuerrate, weniger Schaden'],wide:['Breitstrahl','Doppelt so breite Schiene'],overdrive:['Overdrive','+70% Schienen-Schaden'],overcharge:['Hochdruck','+40% Schaden, etwas langsamer'],stabil:['Stabilisator','Enger Fächer, +20% Feuerrate'],volley:['Salve','+1 Bolzen, je etwas schwächer'],lance:['Lanze','+2 Durchschlag, +30% Schaden'],cluster:['Cluster','+1 Rakete, je schwächer'],bunker:['Bunkerbrecher','+50% Schaden, langsamer'],wide_aoe:['Großsprengung','+50% Explosionsradius'],rapidload:['Schnellschacht','+60% Feuerrate, weniger Schaden'],inferno:['Inferno','+85% Brennschaden'],lingering:['Schwelbrand','Brennt 80% länger'],blaze:['Lodern','+50% Feuerrate, etwas weniger Schaden'],firestorm:['Feuersturm','Mehr Glut & Dauer, springt über'],deepfreeze:['Tiefkühlung','Stärkere & längere Verlangsamung'],blizzard:['Blizzard','+50% Feuerrate, weniger Schaden'],absolute:['Absolut-Null','Friert Ziele zuverlässig ein'],frostbite:['Erfrierung','+85% Schaden, langsamer'],arc:['Lichtbogen','+2 Sprünge, weniger Schaden'],conduit:['Hochleiter','+80% Schaden, langsamer'],tempest:['Sturmfront','+50% Feuerrate, weniger Schaden'],paralyze:['Lähmung','Längerer Stun, +Schaden'],expand:['Ausdehnung','+50% Puls-Radius'],collapse:['Implosion','+80% Schaden, enger'],pulsar:['Pulsar','+60% Pulsrate, weniger Schaden'],singularity:['Singularität','Stößt zurück & verlangsamt'],piercebeam:['Breitbahn','+60% Strahlbreite'],hypervelocity:['Hypergeschoss','+80% Schaden, langsamer'],gigawatt:['Gigawatt','+110% Schaden, deutlich langsamer'],repeater:['Schnellschiene','+80% Feuerrate, weniger Schaden']},
    en:{rapid:['Rapid Fire','+50% fire rate, a bit less damage'],heavy:['Heavy Shot','Slower, but double damage'],scatter:['Scatter','+2 bolts (fan), each weaker'],precise:['Precision','+2 pierce, +40% damage'],swarm:['Swarm','2 smaller missiles'],warhead:['Warhead','1 big missile, +50% radius'],shrapnel:['Shrapnel','Explosion flings shards'],incendiary:['Incendiary','Explosion ignites targets'],ember:['Ember','Over double burn damage'],wildfire:['Wildfire','Fire spreads on death'],accel:['Accelerant','Burns faster (shorter, harder)'],consume:['Consume','Burn-kills grant bonus points'],permafrost:['Permafrost','Longer & stronger slow'],glaciate:['Glaciate','Chance to fully freeze targets'],shatter:['Shatter','Frozen targets burst (AoE)'],brittle:['Brittle','Frozen targets take +50% damage'],fork:['Forking','+3 jumps, less damage each'],highv:['High Voltage','Fewer jumps, big damage + stun'],stormhit:['Storm','Chains also on bolt-kills'],dischargeaoe:['Discharge','Each chain hit with small AoE'],shock:['Shockwave','+50% pulse radius'],overload:['Overload','+90% damage, slower'],repel:['Repel','Knocks hit targets back'],staticfield:['Static Field','Pulse slows hit targets'],charged:['Charged','+100% damage, slower'],autoload:['Autoloader','+70% fire rate, less damage'],wide:['Wide Beam','Twice as wide rail'],overdrive:['Overdrive','+70% rail damage'],overcharge:['High Pressure','+40% damage, a bit slower'],stabil:['Stabilizer','Tighter fan, +20% fire rate'],volley:['Volley','+1 bolt, each a bit weaker'],lance:['Lance','+2 pierce, +30% damage'],cluster:['Cluster','+1 missile, each weaker'],bunker:['Bunker Buster','+50% damage, slower'],wide_aoe:['Big Blast','+50% explosion radius'],rapidload:['Fast Rack','+60% fire rate, less damage'],inferno:['Inferno','+85% burn damage'],lingering:['Smoulder','Burns 80% longer'],blaze:['Blaze','+50% fire rate, slightly less damage'],firestorm:['Firestorm','More burn & duration, spreads'],deepfreeze:['Deep Freeze','Stronger & longer slow'],blizzard:['Blizzard','+50% fire rate, less damage'],absolute:['Absolute Zero','Reliably freezes targets'],frostbite:['Frostbite','+85% damage, slower'],arc:['Arc','+2 jumps, less damage'],conduit:['Conduit','+80% damage, slower'],tempest:['Tempest','+50% fire rate, less damage'],paralyze:['Paralyze','Longer stun, +damage'],expand:['Expand','+50% pulse radius'],collapse:['Collapse','+80% damage, tighter'],pulsar:['Pulsar','+60% pulse rate, less damage'],singularity:['Singularity','Knocks back & slows'],piercebeam:['Wide Track','+60% beam width'],hypervelocity:['Hypervelocity','+80% damage, slower'],gigawatt:['Gigawatt','+110% damage, much slower'],repeater:['Fast Rail','+80% fire rate, less damage']},
    fr:{rapid:['Tir Rapide','+50% cadence, un peu moins de dégâts'],heavy:['Tir Lourd','Plus lent, mais double dégâts'],scatter:['Dispersion','+2 projectiles (éventail), plus faibles'],precise:['Précision','+2 perforation, +40% dégâts'],swarm:['Essaim','2 missiles plus petits'],warhead:['Ogive','1 gros missile, +50% rayon'],shrapnel:['Éclats','L’explosion projette des éclats'],incendiary:['Incendiaire','L’explosion enflamme les cibles'],ember:['Braise','Brûlure plus que doublée'],wildfire:['Embrasement','Le feu se propage à la mort'],accel:['Accélérant','Brûle plus vite (court, fort)'],consume:['Consumer','Les kills par feu donnent des points'],permafrost:['Permafrost','Ralenti plus long & plus fort'],glaciate:['Glaciation','Chance de geler totalement'],shatter:['Éclatement','Les cibles gelées éclatent (AoE)'],brittle:['Fragile','Les cibles gelées subissent +50%'],fork:['Ramification','+3 sauts, moins de dégâts'],highv:['Haute Tension','Moins de sauts, gros dégâts + stun'],stormhit:['Orage','Chaîne aussi sur les kills de tir'],dischargeaoe:['Décharge','Chaque saut avec petit AoE'],shock:['Onde de Choc','+50% de rayon'],overload:['Surcharge','+90% dégâts, plus lent'],repel:['Répulsion','Repousse les cibles touchées'],staticfield:['Champ Statique','Le pulsar ralentit les cibles'],charged:['Chargé','+100% dégâts, plus lent'],autoload:['Rechargeur','+70% cadence, moins de dégâts'],wide:['Rail Large','Rail deux fois plus large'],overdrive:['Overdrive','+70% dégâts du rail'],overcharge:['Haute Pression','+40% dégâts, plus lent'],stabil:['Stabilisateur','Éventail serré, +20% cadence'],volley:['Salve','+1 projectile, plus faibles'],lance:['Lance','+2 perforation, +30% dégâts'],cluster:['Grappe','+1 missile, plus faibles'],bunker:['Anti-Bunker','+50% dégâts, plus lent'],wide_aoe:['Grosse Explosion','+50% de rayon'],rapidload:['Chargeur Rapide','+60% cadence, moins de dégâts'],inferno:['Enfer','+85% dégâts de brûlure'],lingering:['Combustion','Brûle 80% plus longtemps'],blaze:['Embrasement','+50% cadence, un peu moins de dégâts'],firestorm:['Tempête de Feu','Plus de brûlure & durée, propage'],deepfreeze:['Grand Froid','Ralenti plus fort & long'],blizzard:['Blizzard','+50% cadence, moins de dégâts'],absolute:['Zéro Absolu','Gèle les cibles de façon fiable'],frostbite:['Gelure','+85% dégâts, plus lent'],arc:['Arc','+2 sauts, moins de dégâts'],conduit:['Conducteur','+80% dégâts, plus lent'],tempest:['Tempête','+50% cadence, moins de dégâts'],paralyze:['Paralysie','Stun plus long, +dégâts'],expand:['Expansion','+50% de rayon'],collapse:['Implosion','+80% dégâts, plus serré'],pulsar:['Pulsar','+60% cadence, moins de dégâts'],singularity:['Singularité','Repousse & ralentit'],piercebeam:['Voie Large','+60% largeur du faisceau'],hypervelocity:['Hypervitesse','+80% dégâts, plus lent'],gigawatt:['Gigawatt','+110% dégâts, bien plus lent'],repeater:['Rail Rapide','+80% cadence, moins de dégâts']}
  };
  const SYNTR={
    de:{thermo:['Thermoschock','Brennende + gefrorene Ziele nehmen massiven Schaden'],super:['Supraleiter','Kette +2 Sprünge & +80% an Gefrorenen'],napalm:['Napalm','Raketen hinterlassen starken Brand im Explosionsradius'],tesla:['Tesla-Salve','Jeder 3. Blaster-Bolzen verzweigt als Blitz'],icebomb:['Eisbombe','Raketen-Explosion vereist Ziele'],cryonova:['Cryonova','Nova-Puls verlangsamt zusätzlich alle Ziele'],plasma:['Plasma-Schiene','Railgun entzündet getroffene Ziele'],voltspark:['Voltbogen','Jeder Ketten-Treffer zündet eine Mini-Nova'],pyrobolt:['Pyro-Bolzen','Blaster-Bolzen entzünden getroffene Ziele'],railnova:['Schienen-Nova','Railgun-Schuss löst eine Nova aus'],cryoshot:['Frost-Salve','Blaster-Bolzen verlangsamen getroffene Ziele'],novabomb:['Nova-Bombe','Raketen-Explosion löst eine Nova aus'],railchain:['Schienen-Kette','Railgun-Treffer starten einen Kettenblitz'],barrage:['Sperrfeuer','Blaster-Bolzen explodieren klein beim Treffer'],shockbolt:['Schock-Bolzen','Jeder Blaster-Kill löst eine Mini-Nova aus'],overclock:['Übertaktung','Blaster feuert 60% schneller'],clusterarc:['Cluster-Bogen','Raketen-Explosion startet einen Kettenblitz'],siege:['Belagerung','Raketen +50% Schaden & Radius'],wildarc:['Brand-Bogen','Kettenblitz entzündet getroffene Ziele'],embernova:['Glut-Nova','Nova-Puls entzündet alle Ziele'],cryorail:['Frost-Schiene','Railgun vereist die getroffene Spalte']},
    en:{thermo:['Thermal Shock','Burning + frozen targets take massive damage'],super:['Superconductor','Chain +2 jumps & +80% vs frozen'],napalm:['Napalm','Missiles leave fire in the blast radius'],tesla:['Tesla Volley','Every 3rd blaster bolt arcs as lightning'],icebomb:['Ice Bomb','Missile blasts freeze targets'],cryonova:['Cryonova','Nova pulse also slows all targets'],plasma:['Plasma Rail','Railgun ignites targets it hits'],voltspark:['Volt Arc','Each chain hit triggers a mini nova'],pyrobolt:['Pyro Bolt','Blaster bolts ignite the targets they hit'],railnova:['Rail Nova','Railgun shot triggers a nova'],cryoshot:['Frost Volley','Blaster bolts slow the targets they hit'],novabomb:['Nova Bomb','Missile blast triggers a nova'],railchain:['Rail Chain','Railgun hits start a chain lightning'],barrage:['Barrage','Blaster bolts burst on hit'],shockbolt:['Shock Bolt','Every blaster kill triggers a mini nova'],overclock:['Overclock','Blaster fires 60% faster'],clusterarc:['Cluster Arc','Missile blast starts a chain lightning'],siege:['Siege','Missiles +50% damage & radius'],wildarc:['Wild Arc','Chain lightning ignites the targets it hits'],embernova:['Ember Nova','Nova pulse ignites all targets'],cryorail:['Cryo Rail','Railgun freezes the column it hits']},
    fr:{thermo:['Choc Thermique','Cibles en feu + gelées subissent d’énormes dégâts'],super:['Supraconducteur','Chaîne +2 sauts & +80% vs gelés'],napalm:['Napalm','Les missiles laissent du feu dans le rayon'],tesla:['Salve Tesla','Chaque 3e tir du blaster se ramifie'],icebomb:['Bombe de Glace','Les explosions de missiles gèlent'],cryonova:['Cryonova','Le pulsar nova ralentit aussi les cibles'],plasma:['Rail Plasma','Le railgun enflamme les cibles touchées'],voltspark:['Arc Volt','Chaque saut de chaîne déclenche une mini-nova'],pyrobolt:['Boulon Pyro','Les tirs du blaster enflamment les cibles'],railnova:['Nova Rail','Le tir du railgun déclenche une nova'],cryoshot:['Salve de Givre','Les tirs du blaster ralentissent les cibles'],novabomb:['Bombe Nova','L’explosion de missile déclenche une nova'],railchain:['Chaîne Rail','Les tirs du railgun lancent un éclair en chaîne'],barrage:['Barrage','Les tirs du blaster explosent à l’impact'],shockbolt:['Boulon Choc','Chaque kill du blaster déclenche une mini-nova'],overclock:['Surcadence','Le blaster tire 60% plus vite'],clusterarc:['Arc en Grappe','L’explosion de missile lance un éclair en chaîne'],siege:['Siège','Missiles +50% dégâts & rayon'],wildarc:['Arc Sauvage','L’éclair en chaîne enflamme les cibles'],embernova:['Nova Braise','Le pulsar nova enflamme toutes les cibles'],cryorail:['Rail Cryo','Le railgun gèle la colonne touchée']}
  };
  // Lustige/ironische Tooltip-Texte (Info-Button). Keys: Waffen-IDs, Meta-IDs, Synergie-IDs, _tier[i] für Fork-Stufen.
  const FLAVOR={
    de:{ blaster:'Der Klassiker. Schießt nach oben und stellt keine Fragen.', missile:'Zielsuchend. Wie ein Ex, der genau weiß, wo du wohnst.', flame:'Macht aus Hindernissen Grillgut. Medium-rare.', frost:'Klimaanlage mit Aggressionsproblem.', chain:'Stromrechnung rauf, Gegnerzahl runter.', nova:'Sicherheitsabstand – jetzt mit Schockwelle.', rail:'Eine Linie. Eine Meinung. Ganze Spalte weg.',
      bp_missile:'Raketen-Bauplan. IKEA, nur tödlich.', bp_flame:'Feuer-Bauplan. Streichholz war gestern.', bp_frost:'Frost-Bauplan. Bring ’ne Jacke mit.', bp_chain:'Blitz-Bauplan. Erdung optional.', bp_nova:'Nova-Bauplan. Urknall im Taschenformat.', bp_rail:'Railgun-Bauplan. Physiklehrer weinen.',
      slot:'Mehr Modul-Platz. Marie Kondo hasst diesen Trick.', synslot:'Mehr aktive Fusionen. Der Chemie-Unterricht zahlt sich endlich aus.', veteran:'Du startest mit Erfahrung statt mit Naivität.', wcore:'Mehr Bumms pro Schuss. Studien belegen: viel Bumms.', wtempo:'Schneller feuern. Geduld ist eh überbewertet.', critcore:'Mehr Krits. Glück ist jetzt planbar.', critdmgcore:'Krits, die richtig wehtun. Aua.', shield:'Startschild. Bonus-Leben für clevere Feiglinge.', tough:'Mehr aushalten. Härter als deine Montagslaune.', solid:'Kleinere Hitbox. Schlank in den Tod schlängeln.', reach:'Mehr Near-Miss-Reichweite. Knapp ist das neue sicher.', score:'Mehr Punkte. Dein Ego dankt es dir.', luck:'Bessere Karten. Das Universum mag dich – kurz.', rich:'Mehr Coins. Kapitalismus, aber in Neon.',
      thermo:'Heiß trifft kalt. Sauna-Aufguss in der Antarktis.', super:'Strom ohne Widerstand. Die Kette dreht komplett frei.', napalm:'Raketen, die nachglühen. Brandschutz hat Feierabend.', tesla:'Jeder 5. Bolzen wird Blitz. Tesla wäre stolz.', icebomb:'Explosion plus Eiswürfel. Cocktail für Hindernisse.', cryonova:'Nova mit Kühlfunktion. Alles wird langsam… und kalt.', plasma:'Railgun, die brennt. Linie mit Nachglühen.', voltspark:'Kette zündet Mini-Novas. Stromschlag-Buffet.', pyrobolt:'Bolzen, die anzünden. Feuerzeug mit Zielwasser.', railnova:'Schuss löst Nova aus. Doppelt hält besser.', cryoshot:'Bolzen mit Bremse. Tempolimit für Gegner.', novabomb:'Rakete plus Nova. Explosion hoch zwei.', railchain:'Railgun startet Kettenblitz. Eine Linie, alle leiden.', barrage:'Bolzen mit Mini-Knall. Popcorn, aber gefährlich.', shockbolt:'Jeder Kill ein Mini-Knall. Abgang mit Stil.', overclock:'Blaster 40% schneller. Der Lüfter dreht hoch.', clusterarc:'Raketen-Explosion zündet Kette. Domino deluxe.', siege:'Raketen größer & härter. Türen? Welche Türen.', wildarc:'Kettenblitz, der entzündet. Strom + Feuer = Chaos.', embernova:'Nova entzündet alles. Lagerfeuer, nur tödlich.', cryorail:'Railgun vereist die Spalte. Tiefkühl-Express.',
      tier:{ blaster:['Erste Bolzen – süß, fast harmlos.','Jetzt mit Nachdruck. Pew-pew wird ernst.','Dauerfeuer. Der Abzug glüht.','Bolzen-Apokalypse. Wer zählt noch mit?'],
        missile:['Erste Rakete. Zielt grob in die richtige Richtung.','Mehr Sprengkraft. Die Versicherung kündigt.','Salven mit Suchkopf. Niemand entkommt.','Raketenhagel. Der Himmel brennt.'],
        flame:['Ein Fünkchen. Marshmallows bereithalten.','Es lodert. Der Rauchmelder piept nervös.','Flächenbrand. Die Feuerwehr gibt auf.','Inferno. Pyromanen weinen vor Freude.'],
        frost:['Leichter Frost. Jacke wäre clever.','Es wird glatt. Vorsicht, rutschig.','Permafrost. Gegner machen Winterschlaf.','Eiszeit. Selbst die Physik friert ein.'],
        chain:['Erster Funke. Statisch wie ein Pulli.','Es zappt. Die Haare stehen zu Berge.','Gewitter im Nahbereich. Erdung dringend.','Stromausfall in der ganzen Stadt. Ups.'],
        nova:['Kleiner Schubs. Persönlicher Raum, höflich.','Schockwelle. Jetzt mit Ansage.','Druckwelle wie ein Bass-Drop. Wände wackeln.','Urknall to go. Bitte Abstand halten.'],
        rail:['Erste Linie. Lineal mit Attitude.','Durchschuss. Die Spalte sagt aua.','Hyperschuss. Der Physiklehrer schwitzt.','Gigawatt-Strahl. Die Realität bekommt Risse.'] },
      path:{ rapid:'Finger am Abzug festgeklebt.', heavy:'Selten, aber dann tut’s richtig weh.', scatter:'Gießkanne, aber mit Bolzen.', precise:'Durchschlag-Diplom mit Auszeichnung.', overcharge:'Mehr Druck im Lauf.', stabil:'Ruhige Hand, enges Muster.', volley:'Einer geht noch. Immer.', lance:'Spießt alles auf wie Grillgut.', swarm:'Zwei kleine Quälgeister statt einem.', warhead:'Größe ist eben doch alles.', shrapnel:'Teilt aus – im wörtlichsten Sinn.', incendiary:'Explosion mit Nachglühen.', cluster:'Je mehr, desto Bumms.', bunker:'Klopft auch bei dicken Wänden an.', wide_aoe:'Der Radius grüßt die Nachbarn.', rapidload:'Nachladen? Quasi nie.', ember:'Glüht nach wie ein schlechtes Gewissen.', wildfire:'Teilt das Feuer großzügig.', accel:'Kurz, heiß, schmerzhaft.', consume:'Asche zu Punkten.', inferno:'Medium-rare war gestern.', lingering:'Brennt wie eine alte Rechnung.', blaze:'Dauerflamme, kein Feuerzeug nötig.', firestorm:'Wirbelt Feuer wie Konfetti.', permafrost:'Dauerwinter ohne Heizkosten.', glaciate:'Tiefkühl-Roulette: manchmal komplett vereist.', shatter:'Erst frosten, dann zersplittern.', brittle:'Kalt und zerbrechlich – wie deine Ausreden.', deepfreeze:'Bis aufs Mark durchgekühlt.', blizzard:'Schneesturm im Dauerfeuer.', absolute:'Null Kelvin, null Mitleid.', frostbite:'Erfrierung mit Ansage.', fork:'Springt rum wie auf einer Hüpfburg.', highv:'Ein Schlag, große Wirkung.', stormhit:'Jeder Tote lädt zur Party.', dischargeaoe:'Knistert an allen Ecken.', arc:'Hangelt sich von Ziel zu Ziel.', conduit:'Bester Leiter seit der Hochspannung.', tempest:'Dauergewitter, kein Schirm hilft.', paralyze:'Schockstarre inklusive.', shock:'Mehr Abstand, mehr Respekt.', overload:'Lädt durch, drückt zu.', repel:'Persönlicher Türsteher.', staticfield:'Bremst alles im Umkreis aus.', expand:'Die Welle holt weiter aus.', collapse:'Klein, aber brachial.', pulsar:'Pulsiert wie ein nervöser Bass.', singularity:'Schwarzes Loch im Taschenformat.', charged:'Lange zielen, kurz weinen lassen.', autoload:'Schiene am Fließband.', wide:'Spalte? Eher Schneise.', overdrive:'Voll aufgedreht.', piercebeam:'Trifft auch, was daneben steht.', hypervelocity:'Schneller als deine Reflexe.', gigawatt:'1,21 Gigawatt. Großartig.', repeater:'Schiene auf Repeat.' } },
    en:{ blaster:'The classic. Shoots up, asks no questions.', missile:'Homing. Like an ex who knows your address.', flame:'Turns obstacles into BBQ. Medium-rare.', frost:'Air conditioning with anger issues.', chain:'Power bill up, enemy count down.', nova:'Personal space — now with a shockwave.', rail:'One line. One opinion. Whole column gone.',
      bp_missile:'Missile blueprint. IKEA, but lethal.', bp_flame:'Fire blueprint. Matches are so last season.', bp_frost:'Frost blueprint. Bring a jacket.', bp_chain:'Lightning blueprint. Grounding optional.', bp_nova:'Nova blueprint. Big Bang, travel size.', bp_rail:'Railgun blueprint. Physics teachers cry.',
      slot:'More module space. Marie Kondo hates this trick.', synslot:'More active fusions. Chemistry class finally pays off.', veteran:'Start with experience instead of naivety.', wcore:'More boom per shot. Studies confirm: much boom.', wtempo:'Fire faster. Patience is overrated anyway.', critcore:'More crits. Luck, now schedulable.', critdmgcore:'Crits that really hurt. Ouch.', shield:'Start shield. A bonus life for clever cowards.', tough:'Take more hits. Tougher than your Monday mood.', solid:'Smaller hitbox. Slim your way out of death.', reach:'More near-miss range. Close is the new safe.', score:'More points. Your ego says thanks.', luck:'Better cards. The universe likes you — briefly.', rich:'More coins. Capitalism, but in neon.',
      thermo:'Hot meets cold. Sauna session in Antarctica.', super:'No resistance. The chain goes fully feral.', napalm:'Missiles that keep burning. Fire safety clocked out.', tesla:'Every 5th bolt becomes lightning. Tesla approves.', icebomb:'Explosion plus ice cubes. A cocktail for obstacles.', cryonova:'Nova with cooling. Everything slows… and chills.', plasma:'A railgun that burns. A line with afterglow.', voltspark:'Chain triggers mini novas. Electro buffet.', pyrobolt:'Bolts that ignite. A lighter with good aim.', railnova:'Shot triggers a nova. Twice is nice.', cryoshot:'Bolts with brakes. Speed limit for enemies.', novabomb:'Missile plus nova. Explosion squared.', railchain:'Railgun starts a chain. One line, everyone suffers.', barrage:'Bolts with mini-blasts. Popcorn, but dangerous.', shockbolt:'Every kill a mini-blast. Exit with style.', overclock:'Blaster 40% faster. The fan spins up.', clusterarc:'Missile blast lights a chain. Domino deluxe.', siege:'Missiles bigger & harder. Doors? What doors.', wildarc:'Chain that ignites. Volts + fire = chaos.', embernova:'Nova ignites everything. Campfire, but lethal.', cryorail:'Railgun freezes the column. Frozen-aisle express.',
      tier:{ blaster:['First bolts — cute, almost harmless.','Now with attitude. Pew-pew gets serious.','Full auto. The trigger glows.','Bolt apocalypse. Who’s still counting?'],
        missile:['First rocket. Aims roughly the right way.','More boom. Insurance cancels.','Homing volleys. Nobody escapes.','Missile storm. The sky is on fire.'],
        flame:['A tiny spark. Ready the marshmallows.','It blazes. The smoke alarm panics.','Wildfire. The fire brigade gives up.','Inferno. Pyromaniacs weep with joy.'],
        frost:['Light frost. A jacket would be smart.','Getting slippery. Mind the ice.','Permafrost. Enemies hibernate.','Ice age. Even physics freezes.'],
        chain:['First spark. Static like a sweater.','It zaps. Hair stands on end.','Close-range thunderstorm. Ground yourself.','City-wide blackout. Oops.'],
        nova:['A little shove. Personal space, politely.','Shockwave. Now with a warning.','Pressure wave like a bass drop. Walls shake.','Big Bang to go. Please keep your distance.'],
        rail:['First line. A ruler with attitude.','Punch-through. The column says ow.','Hypershot. Physics teacher sweats.','Gigawatt beam. Reality starts to crack.'] },
      path:{ rapid:'Finger superglued to the trigger.', heavy:'Rare, but it really hurts.', scatter:'A watering can, but with bolts.', precise:'Pierce diploma, with honors.', overcharge:'More pressure in the barrel.', stabil:'Steady hand, tight pattern.', volley:'Room for one more. Always.', lance:'Skewers everything like BBQ.', swarm:'Two small pests instead of one.', warhead:'Turns out size is everything.', shrapnel:'Lashes out — literally.', incendiary:'Explosion with an afterglow.', cluster:'The more, the boom.', bunker:'Knocks even on thick walls.', wide_aoe:'The blast says hi to the neighbors.', rapidload:'Reloading? Basically never.', ember:'Smoulders like a guilty conscience.', wildfire:'Shares the fire generously.', accel:'Short, hot, painful.', consume:'Ashes into points.', inferno:'Medium-rare is so last patch.', lingering:'Burns like an old bill.', blaze:'Permanent flame, no lighter needed.', firestorm:'Whirls fire like confetti.', permafrost:'Endless winter, no heating bill.', glaciate:'Frozen roulette: sometimes a full freeze.', shatter:'Freeze first, shatter later.', brittle:'Cold and fragile — like your excuses.', deepfreeze:'Chilled to the bone.', blizzard:'Snowstorm on full auto.', absolute:'Zero Kelvin, zero mercy.', frostbite:'Frostbite, as advertised.', fork:'Bounces around like a bouncy castle.', highv:'One hit, big drama.', stormhit:'Every kill RSVPs to the party.', dischargeaoe:'Crackles in every corner.', arc:'Swings from target to target.', conduit:'Best conductor since high voltage.', tempest:'Endless storm, no umbrella helps.', paralyze:'Freeze-frame included.', shock:'More distance, more respect.', overload:'Charges up, slams down.', repel:'Your personal bouncer.', staticfield:'Slows everything around you.', expand:'The wave reaches further.', collapse:'Small, but brutal.', pulsar:'Pulses like a nervous bass line.', singularity:'A black hole, travel size.', charged:'Aim long, make them cry short.', autoload:'Rails off the assembly line.', wide:'Column? More like a clearing.', overdrive:'Cranked all the way up.', piercebeam:'Hits what stands nearby too.', hypervelocity:'Faster than your reflexes.', gigawatt:'1.21 gigawatts. Great Scott.', repeater:'Rail on repeat.' } },
    fr:{ blaster:'Le classique. Tire vers le haut, sans poser de questions.', missile:'À tête chercheuse. Comme un ex qui connaît ton adresse.', flame:'Transforme les obstacles en barbecue. Saignant.', frost:'La clim, version problèmes de colère.', chain:'Facture d’électricité en hausse, ennemis en baisse.', nova:'Distance de sécurité — avec onde de choc.', rail:'Une ligne. Un avis. Colonne entière effacée.',
      bp_missile:'Plan de missiles. IKEA, mais mortel.', bp_flame:'Plan de feu. Les allumettes, c’est dépassé.', bp_frost:'Plan de givre. Prends une veste.', bp_chain:'Plan d’éclairs. Mise à la terre optionnelle.', bp_nova:'Plan de nova. Big Bang format poche.', bp_rail:'Plan de railgun. Les profs de physique pleurent.',
      slot:'Plus de place pour modules. Marie Kondo déteste ça.', veteran:'Commence avec de l’expérience plutôt que la naïveté.', wcore:'Plus de boum par tir. La science confirme : beaucoup de boum.', wtempo:'Tire plus vite. La patience est surcotée.', critcore:'Plus de crits. La chance, désormais planifiable.', critdmgcore:'Des crits qui font mal. Aïe.', shield:'Bouclier de départ. Une vie bonus pour lâches malins.', tough:'Encaisse plus. Plus dur que ton humeur du lundi.', solid:'Hitbox plus petite. Esquive la mort en mode mince.', reach:'Plus de portée de near-miss. Juste, c’est le nouveau sûr.', score:'Plus de points. Ton ego te remercie.', luck:'De meilleures cartes. L’univers t’aime — brièvement.', rich:'Plus de coins. Le capitalisme, mais en néon.',
      thermo:'Le chaud rencontre le froid. Sauna en Antarctique.', super:'Sans résistance. La chaîne part en vrille.', napalm:'Des missiles qui brûlent encore. La sécurité incendie a fini.', tesla:'Chaque 5e tir devient éclair. Tesla approuve.', icebomb:'Explosion plus glaçons. Un cocktail pour obstacles.', cryonova:'Nova avec clim. Tout ralentit… et refroidit.', plasma:'Un railgun qui brûle. Une ligne qui rougeoie.', voltspark:'La chaîne déclenche des mini-novas. Buffet électrique.', pyrobolt:'Des tirs qui enflamment. Un briquet bien visé.', railnova:'Le tir déclenche une nova. Deux valent mieux qu’une.', cryoshot:'Des tirs avec freins. Limitation de vitesse pour ennemis.', novabomb:'Missile plus nova. Explosion au carré.', railchain:'Le railgun lance une chaîne. Une ligne, tout le monde souffre.', barrage:'Des tirs à mini-explosion. Du popcorn, mais dangereux.', shockbolt:'Chaque kill, une mini-explosion. Sortie stylée.', overclock:'Blaster 40% plus rapide. Le ventilo s’emballe.', clusterarc:'L’explosion de missile lance une chaîne. Domino deluxe.', siege:'Missiles plus gros & plus durs. Des portes ? Quelles portes.', wildarc:'Une chaîne qui enflamme. Volts + feu = chaos.', embernova:'La nova enflamme tout. Feu de camp, mais mortel.', cryorail:'Le railgun gèle la colonne. Express rayon surgelés.',
      tier:{ blaster:['Premiers tirs — mignon, presque inoffensif.','Avec du caractère. Le pew-pew devient sérieux.','Tir continu. La détente chauffe.','Apocalypse de tirs. Qui compte encore ?'],
        missile:['Premier missile. Vise à peu près juste.','Plus d’explosif. L’assurance résilie.','Salves à tête chercheuse. Personne n’échappe.','Pluie de missiles. Le ciel s’embrase.'],
        flame:['Une étincelle. Prépare les marshmallows.','Ça flambe. Le détecteur de fumée panique.','Incendie. Les pompiers abandonnent.','Enfer. Les pyromanes pleurent de joie.'],
        frost:['Léger givre. Une veste serait maligne.','Ça glisse. Attention au verglas.','Permafrost. Les ennemis hibernent.','Ère glaciaire. Même la physique gèle.'],
        chain:['Première étincelle. Statique comme un pull.','Ça grésille. Les cheveux se dressent.','Orage rapproché. Mets-toi à la terre.','Panne de courant générale. Oups.'],
        nova:['Une petite poussée. Espace perso, poliment.','Onde de choc. Maintenant annoncée.','Onde de pression façon drop de basse. Les murs tremblent.','Big Bang à emporter. Garde tes distances.'],
        rail:['Première ligne. Une règle qui a du caractère.','Transpercement. La colonne dit aïe.','Hypertir. Le prof de physique transpire.','Rayon gigawatt. La réalité se fissure.'] },
      path:{ rapid:'Doigt collé à la détente.', heavy:'Rare, mais ça fait vraiment mal.', scatter:'Un arrosoir, mais à projectiles.', precise:'Diplôme de perforation, mention bien.', overcharge:'Plus de pression dans le canon.', stabil:'Main sûre, tir groupé.', volley:'Encore un. Toujours.', lance:'Embroche tout comme au barbecue.', swarm:'Deux petits casse-pieds au lieu d’un.', warhead:'La taille, ça compte finalement.', shrapnel:'Distribue — au sens propre.', incendiary:'Explosion avec arrière-feu.', cluster:'Plus on est, plus ça boume.', bunker:'Frappe même les murs épais.', wide_aoe:'Le rayon salue les voisins.', rapidload:'Recharger ? Quasi jamais.', ember:'Couve comme une mauvaise conscience.', wildfire:'Partage le feu généreusement.', accel:'Court, chaud, douloureux.', consume:'Des cendres en points.', inferno:'Le saignant, c’est dépassé.', lingering:'Brûle comme une vieille facture.', blaze:'Flamme permanente, sans briquet.', firestorm:'Fait tourbillonner le feu comme des confettis.', permafrost:'Hiver sans fin, sans facture de chauffage.', glaciate:'Roulette glacée : parfois un gel total.', shatter:'Geler d’abord, briser ensuite.', brittle:'Froid et fragile — comme tes excuses.', deepfreeze:'Glacé jusqu’aux os.', blizzard:'Tempête de neige en rafale.', absolute:'Zéro Kelvin, zéro pitié.', frostbite:'Gelure, comme annoncé.', fork:'Rebondit comme sur un château gonflable.', highv:'Un coup, grand drame.', stormhit:'Chaque mort invite à la fête.', dischargeaoe:'Crépite dans tous les coins.', arc:'Se balance de cible en cible.', conduit:'Meilleur conducteur depuis la haute tension.', tempest:'Orage sans fin, aucun parapluie n’aide.', paralyze:'Arrêt sur image inclus.', shock:'Plus de distance, plus de respect.', overload:'Se charge, écrase.', repel:'Ton videur personnel.', staticfield:'Ralentit tout autour de toi.', expand:'L’onde va plus loin.', collapse:'Petit, mais brutal.', pulsar:'Pulse comme une basse nerveuse.', singularity:'Un trou noir format poche.', charged:'Vise longtemps, fais pleurer vite.', autoload:'Du rail à la chaîne.', wide:'Une colonne ? Plutôt une clairière.', overdrive:'À fond les manettes.', piercebeam:'Touche aussi ce qui est à côté.', hypervelocity:'Plus rapide que tes réflexes.', gigawatt:'1,21 gigawatts. Magnifique.', repeater:'Rail en boucle.' } }
  };
  const FLAV=id=>((FLAVOR[lang]&&FLAVOR[lang][id])||FLAVOR.en[id]||'');
  const flavTier=(id,i)=>{ const T=(FLAVOR[lang]&&FLAVOR[lang].tier)||FLAVOR.en.tier; const a=(T&&T[id])||(FLAVOR.en.tier&&FLAVOR.en.tier[id])||[]; return a[i]||''; };
  const flavPath=p=>{ const P=(FLAVOR[lang]&&FLAVOR[lang].path)||FLAVOR.en.path; return (P&&P[p])||(FLAVOR.en.path&&FLAVOR.en.path[p])||''; };
  const wName=id=>((WTR[lang]&&WTR[lang][id])||WTR.en[id]||[id])[0];
  const wDesc=id=>(((WTR[lang]&&WTR[lang][id])||WTR.en[id]||['',''])[1])||'';
  const pName=id=>((PTR[lang]&&PTR[lang][id])||PTR.en[id]||[id])[0];
  const pDesc=id=>(((PTR[lang]&&PTR[lang][id])||PTR.en[id]||['',''])[1])||'';
  const synName=id=>((SYNTR[lang]&&SYNTR[lang][id])||SYNTR.en[id]||[id])[0];
  const synDesc=id=>(((SYNTR[lang]&&SYNTR[lang][id])||SYNTR.en[id]||['',''])[1])||'';
  // Icons für die Skill-Pfad-Knoten (visueller Baum)
  const PATHICO={rapid:'⏩',heavy:'💢',scatter:'🌬️',precise:'🎯',swarm:'🐝',warhead:'💣',shrapnel:'🎇',incendiary:'🔥',ember:'🥵',wildfire:'🌋',accel:'♨️',consume:'🍽️',permafrost:'🧊',glaciate:'❄️',shatter:'💥',brittle:'🩹',fork:'🌿',highv:'⚡',stormhit:'⛈️',dischargeaoe:'🔆',shock:'🌐',overload:'🟪',repel:'↗️',staticfield:'🕸️',charged:'🔋',autoload:'🔁',wide:'↔️',overdrive:'🚀',overcharge:'🔺',stabil:'🎚️',volley:'🔱',lance:'🗡️',cluster:'🧫',bunker:'🏚️',wide_aoe:'💥',rapidload:'⏬',inferno:'😈',lingering:'🕯️',blaze:'🔆',firestorm:'🌪️',deepfreeze:'🧊',blizzard:'🌨️',absolute:'❄️',frostbite:'🦷',arc:'🌈',conduit:'🔌',tempest:'🌩️',paralyze:'💫',expand:'⭕',collapse:'🕳️',pulsar:'💠',singularity:'🌌',piercebeam:'🛤️',hypervelocity:'☄️',gigawatt:'🔋',repeater:'🚄'};
  const METATR={
    de:{slot:['Modul-Slot','+1 Waffen-Slot (max 5)'],synslot:['Fusions-Slot','+1 gleichzeitig aktive Fusion (max 4)'],bp_missile:['Bauplan: Raketen','Schaltet Lenkraketen dauerhaft frei – im Run baubar'],bp_flame:['Bauplan: Brand','Schaltet Brandbolzen dauerhaft frei – im Run baubar'],bp_frost:['Bauplan: Frost','Schaltet Frostschuss dauerhaft frei – im Run baubar'],bp_chain:['Bauplan: Kette','Schaltet Kettenblitz dauerhaft frei – im Run baubar'],bp_nova:['Bauplan: Nova','Schaltet den Nova-Puls dauerhaft frei – im Run baubar'],bp_rail:['Bauplan: Railgun','Schaltet die Railgun dauerhaft frei – im Run baubar'],shield:['Startschild','+1 Schild zu Beginn je Stufe'],tough:['Zähigkeit','+1 Leben zu Beginn je Stufe'],solid:['Solide Hülle','Start-Hitbox −5% je Stufe'],reach:['Fern-Sensor','Near-Miss-Radius +9% je Stufe'],score:['Punkte-Boost','+15% Punkte je Stufe'],luck:['Glückssträhne','Power-Up-Droprate +10% je Stufe'],rich:['Chip-Magnet','+12% Chip-Ausbeute je Stufe'],veteran:['Veteran','+1 Start-Skillpunkt je Stufe'],wcore:['Waffenkern','ALLE Waffen +6% Schaden je Stufe'],wtempo:['Taktchip','ALLE Waffen +5% Feuerrate je Stufe'],critcore:['Zielkern','+3% Krit-Chance je Stufe'],critdmgcore:['Wuchtkern','Mehr Krit-Schaden je Stufe (abflachend)'],rspeed:['Forschungslabor','Forschung −12% Zeit je Stufe (auch laufende Beschleunigung günstiger)']},
    en:{slot:['Module Slot','+1 weapon slot (max 5)'],synslot:['Fusion Slot','+1 active fusion at once (max 4)'],bp_missile:['Blueprint: Missiles','Unlocks homing missiles permanently · build it in-run'],bp_flame:['Blueprint: Flame','Unlocks flame bolts permanently · build it in-run'],bp_frost:['Blueprint: Frost','Unlocks frost shot permanently · build it in-run'],bp_chain:['Blueprint: Chain','Unlocks chain lightning permanently · build it in-run'],bp_nova:['Blueprint: Nova','Unlocks the Nova pulse permanently · build it in-run'],bp_rail:['Blueprint: Railgun','Unlocks the railgun permanently · build it in-run'],shield:['Start Shield','+1 shield at start per lvl'],tough:['Toughness','+1 life at start per lvl'],solid:['Solid Hull','Start hitbox −5% per lvl'],reach:['Far Sensor','Near-miss radius +9% per lvl'],score:['Score Boost','+15% score per lvl'],luck:['Lucky Streak','Power-up drop rate +10% per lvl'],rich:['Chip Magnet','+12% chip yield per lvl'],veteran:['Veteran','+1 start skill point per lvl'],wcore:['Weapon Core','ALL weapons +6% damage per lvl'],wtempo:['Cadence Chip','ALL weapons +5% fire rate per lvl'],critcore:['Focus Core','+3% crit chance per lvl'],critdmgcore:['Heavy Core','More crit damage per lvl (diminishing)'],rspeed:['Research Lab','Research −12% time per level']},
    fr:{slot:['Slot de Module','+1 slot d’arme (max 5)'],synslot:['Slot de Fusion','+1 fusion active à la fois (max 4)'],bp_missile:['Plan: Missiles','Débloque les missiles (jouable en partie)'],bp_flame:['Plan: Feu','Débloque les tirs incendiaires'],bp_frost:['Plan: Givre','Débloque le tir de givre'],bp_chain:['Plan: Chaîne','Débloque l’éclair en chaîne'],bp_nova:['Plan: Nova','Débloque le pulsar nova'],bp_rail:['Plan: Railgun','Débloque le railgun'],shield:['Bouclier de Départ','+1 bouclier au départ/niv'],tough:['Robustesse','+1 vie au départ/niv'],solid:['Coque Solide','Hitbox de départ −5%/niv'],reach:['Capteur Lointain','Rayon near-miss +9%/niv'],score:['Boost de Score','+15% score/niv'],luck:['Veine','Taux de drop +10%/niv'],rich:['Aimant à Chips','+12% de chips/niv'],veteran:['Vétéran','+1 point de skill au départ/niv'],wcore:['Noyau d’Arme','TOUTES les armes +6% dégâts/niv'],wtempo:['Puce de Cadence','TOUTES les armes +5% cadence/niv'],critcore:['Noyau de Focus','+3% chance de critique/niv'],critdmgcore:['Noyau Lourd','Plus de dégâts crit/niv (dégressif)'],rspeed:['Labo de Recherche','Recherche −12% de temps/niv']}
  };
  const uName=id=>((UPTR[lang]&&UPTR[lang][id])||UPTR.en[id]||UPTR.de[id]||[id])[0];
  const uDesc=id=>(((UPTR[lang]&&UPTR[lang][id])||UPTR.en[id]||UPTR.de[id]||['',''])[1])||'';
  const mName=id=>((METATR[lang]&&METATR[lang][id])||METATR.en[id]||METATR.de[id]||[id])[0];
  const mTxt =id=>(((METATR[lang]&&METATR[lang][id])||METATR.en[id]||METATR.de[id]||['',''])[1])||'';
  let shopTab='ship';   // aktiver Werkstatt-Reiter (Waffen/Synergien laufen über den Hangar)
  // Waffen/Synergien laufen jetzt über den Hangar (Loadout/Synergien) → in der Werkstatt nur noch dauerhafte Boosts + Kosmetik
  const SHOPTABS=[['ship','🛡️'],['power','💥'],['economy','🪙'],['cosmetic','🎨']];
  const shopName=m=> m.id.indexOf('fu_')===0 ? wName(m.id.slice(3))+' – Pfade' : (m.id.indexOf('sy_')===0 ? synName(m.id.slice(3)) : mName(m.id));
  const shopDesc=m=> m.id.indexOf('fu_')===0 ? (wArch(m.id.slice(3))+' · nächste Skill-Pfad-Stufe (im Run wählbar)') : (m.id.indexOf('sy_')===0 ? synDesc(m.id.slice(3)) : (mTxt(m.id)+(m.id.indexOf('bp_')===0?(' · '+wArch(m.id.slice(3))):'')));
  const FORMTR={de:{sine:'Wellenflug',drift:'Gleiter',orbit:'Kreisel',zigzag:'Irrläufer',pendulum:'Pendler'},
    en:{sine:'Wave Flight',drift:'Glider',orbit:'Orbiter',zigzag:'Zigzagger',pendulum:'Pendulum'},
    fr:{sine:'Vol Ondulé',drift:'Planeur',orbit:'Orbiteur',zigzag:'Zigzagueur',pendulum:'Pendule'}};
  const formName=k=>((FORMTR[lang]&&FORMTR[lang][k])||FORMTR.en[k]||k);
  const modeLabel=m=>t('m_'+(m==='hardcore'?'hard':m));

  let player, obstacles, orbs, powerups, particles, floaters, lasers, stars, bullets, gems, sps, coinz, loot;   // sps = Skillpunkt-Drops, coinz = Münz-Pickups (1/2/5/10), loot = Beute-Drops (Phase 2)
  let tBlast=0, tMiss=0, tFlame=0, tFrost=0, tChain=0, tNova=0, tRail=0, teslaCount=0, bossPending=false, boss=null, ebullets=[], gemT=0, beams=[], zaps=[], novas=[], gibs=[];
  let score, displayScore, combo, multiplier, best=loadScores();
  let comboCoinBonus=0;   // während einer Combo aufgelaufene Zusatz-Münzen (Anzeige am Combo-Ende)
  function loadScores(){ try{ const r=JSON.parse(localStorage.getItem('thronerush_best')); if(r&&typeof r==='object') return {normal:r.normal||0,hardcore:r.hardcore||0,zen:r.zen||0,daily:r.daily||0,dailyDate:r.dailyDate||''}; }catch(e){} return {normal:0,hardcore:0,zen:0,daily:0,dailyDate:''}; }
  function saveScores(){ try{ localStorage.setItem('thronerush_best',JSON.stringify(best)); }catch(e){} }
  // Meta-Progression: persistente Chips + dauerhafte Upgrade-Stufen
  let meta=loadMeta();
  function loadMeta(){ try{ const r=JSON.parse(localStorage.getItem('thronerush_meta')); if(r&&typeof r==='object'){
    const ships=Array.isArray(r.ships)?r.ships:((r.customShip&&r.customShip.cells)?[{name:'Schiff 1',cells:r.customShip.cells}]:[]);   // Migration: alt-customShip -> ships[0]
    return {chips:r.chips||0,lvl:r.lvl||{},won:r.won||0,shopDate:r.shopDate||'',ach:r.ach||{},stats:r.stats||{},skins:r.skins||{},skin:r.skin||'std',diff:(r.diff==null?2:r.diff),ships,shipSlot:r.shipSlot||0,loadout:(r.loadout&&typeof r.loadout==='object')?r.loadout:null,startKit:(Array.isArray(r.startKit)?r.startKit:null),ms:(r.ms&&typeof r.ms==='object')?r.ms:{},sp:(r.sp==null?1:Math.max(0,r.sp|0)),spBought:r.spBought||0,sp1:r.sp1||0,seen:(r.seen&&typeof r.seen==='object')?r.seen:{},research:(r.research&&typeof r.research==='object')?r.research:{active:null}}; } }catch(e){}
    return {chips:0,lvl:{},won:0,shopDate:'',ach:{},stats:{},skins:{},skin:'std',diff:2,ships:[],shipSlot:0,loadout:null,sp:1,spBought:0,sp1:0,seen:{},unlocks:{},research:{active:null}}; }   // Standard-Schwierigkeit = Normalo (Index 2), auch nach Reset
  function saveMeta(){ try{ localStorage.setItem('thronerush_meta',JSON.stringify(meta)); }catch(e){} }
  // Skillpunkte sind persistent (Boss-Drops / seltene Drops / im Hangar für Coins kaufbar) → in meta.sp gespiegelt
  function saveSP(){ meta.sp=Math.max(0,skillPts|0); saveMeta(); }
  // ---- Schwierigkeitsgrade (Baby = aktuelles Balancing = leichteste Stufe; höhere Stufen ziehen Tempo & Dichte ganz leicht an) ----
  const DIFFS=[
    {name:'👶 Baby',                         spd:-15, hp:-30, den:-20, coin:0.5,  q:'So entspannt, dass sogar dein Toaster gewinnen würde.'},
    {name:'🙈 Schau mal Mama',               spd:0,   hp:0,   den:0,   coin:0.75, q:'Erste Gehversuche – Mama ist stolz, der Highscore weniger.'},
    {name:'😎 Normalo',                      spd:11,  hp:58,  den:26,  coin:1.0,  q:'Goldene Mitte. Für Leute mit Job und Restwürde.'},
    {name:'📱 Doomscroll-König',             spd:20,  hp:80,  den:40,  coin:1.5,  q:'Daumen-Ausdauer wie beim 3-Stunden-Reels-Marathon.'},
    {name:'🚽 Toiletten-Kaiser',            spd:30,  hp:120, den:60,  coin:2.0,  q:'Nur für Profis mit Sitzfleisch und Nerven aus Stahl.'},
    {name:'💀 Chuck Norris ist hier gestorben', spd:40, hp:160, den:80, coin:2.5, q:'Hier starb sogar Chuck Norris. Viel Glück, Sterblicher.'}
  ];
  let diffMul=1, diffSpd=1, diffHp=1, diffDen=1, diffChip=1;   // werden beim Spielstart aus meta.diff abgeleitet
  const fmt=n=>{ n=Math.round(n||0); let s; if(n>=10000){ s=(n/1000).toFixed(n>=100000?0:1).replace(/\.0$/,'')+'k'; } else s=''+n; try{ if(lang==='de') return s.replace('.',','); }catch(e){} return s; };
  const fmtTime=x=>{ x=Math.max(0,Math.ceil(x)); return x>=60?(Math.floor(x/60)+'m'+(x%60?(' '+(x%60)+'s'):'')):(x+'s'); };
  function statN(k){ return (meta.stats&&meta.stats[k])||0; }
  function addStat(k,n){ meta.stats=meta.stats||{}; meta.stats[k]=(meta.stats[k]||0)+n; }
  // Werkstatt-Upgrades: Kosten = Basis × Stufe^1.8 (zwischen linear & exponentiell) & immer krasser
  const META=[
    // Waffen & Fork-Stufen laufen jetzt rein über Skillpunkte (kein Coin-Bauplan/Vorkauf mehr) → eine Hürde
    {id:'slot',        ico:'🧩',name:'Modul-Slot',   base:600,max:2,prio:9},
    {id:'veteran',     ico:'🎖️',name:'Veteran',      base:300,max:6,prio:6},
    {id:'wcore',       ico:'💥',name:'Waffenkern',   base:240,max:7,prio:8},
    {id:'wtempo',      ico:'⏩',name:'Taktchip',     base:240,max:7,prio:7},
    {id:'critcore',    ico:'🎯',name:'Zielkern',     base:280,max:6,prio:7},
    {id:'critdmgcore', ico:'💢',name:'Wuchtkern',    base:360,max:6,prio:6},
    {id:'shield',      ico:'🛡️',name:'Startschild',  base:90, max:3,prio:5},
    {id:'tough',       ico:'💗',name:'Zähigkeit',    base:300,max:2,prio:8},
    {id:'solid',       ico:'🔻',name:'Solide Hülle', base:80, max:7,prio:3},
    {id:'reach',       ico:'📡',name:'Fern-Sensor',  base:70, max:7,prio:3},
    {id:'score',       ico:'💎',name:'Punkte-Boost', base:130,max:8,prio:5},
    {id:'luck',        ico:'🎁',name:'Glückssträhne',base:100,max:6,prio:4},
    {id:'rich',        ico:'🪙', name:'Chip-Magnet',  base:60, max:10,prio:4},
    {id:'rspeed',      ico:'🔬', name:'Forschungslabor', base:220,max:8,prio:7}
  ];
  const metaCost=(m,lvl)=>Math.round(m.base*Math.pow(lvl+1,2.2)/10)*10;   // steilere Kurve: je höher die Stufe, desto teurer (krasser Grind oben)
  const metaLvl=id=>(meta.lvl&&meta.lvl[id])||0;
  // ---------- Forschung: Echtzeit-Forschungssystem (offline-fähig über Zeitstempel) ----------
  // Genau EINE aktive Forschung; läuft nach echter Uhr (auch App geschlossen). Abschluss erhöht meta.lvl[id] (wie früher der Kauf).
  function researchState(){ if(!meta.research||typeof meta.research!=='object') meta.research={active:null}; return meta.research; }
  function researchActive(){ return researchState().active||null; }
  function researchSpeedFactor(){ return 1/(1+0.12*metaLvl('rspeed')); }   // jede Labor-Stufe −12% Forschungszeit (rspeed folgt als Shop-Item)
  function metaDuration(m,lvl){ return Math.max(15,Math.round((20+metaCost(m,lvl)*0.05)*(lvl+1)*researchSpeedFactor())); }   // Sekunden: teurer & höhere Stufe = länger
  function researchRemaining(){ const a=researchActive(); return a?Math.max(0,a.dur-(Date.now()-a.start)/1000):0; }
  function researchProgress(){ const a=researchActive(); return a?Math.min(1,((Date.now()-a.start)/1000)/a.dur):0; }
  function researchDone(){ const a=researchActive(); return !!a && researchRemaining()<=0; }
  function accelerateCost(){ const a=researchActive(); return a?Math.max(10,Math.ceil(researchRemaining()*2)):0; }   // Coins zum Sofort-Fertigstellen (∝ Restzeit)
  function applyResearchUnlock(id){ if(id==='slot') arsenal.slots=3+metaLvl('slot'); if(id.indexOf('sy_')===0||id==='synslot') recalcArsenal(); }   // Sofort-Effekte beim Abschluss
  function startResearch(id){ const m=META.find(x=>x.id===id); if(!m) return false; const lvl=metaLvl(id);
    if(lvl>=m.max || researchActive()) return false; const cost=metaCost(m,lvl); if((meta.chips||0)<cost) return false;
    meta.chips-=cost; researchState().active={id,lvl,start:Date.now(),dur:metaDuration(m,lvl)}; saveMeta(); return true; }
  function queuedCount(id){ const q=researchState().queue||[]; let n=0; for(const e of q) if(e.id===id) n++; return n; }
  function startNext(nextStart){ const q=researchState().queue||[]; if(q.length){ const nx=q.shift(); researchState().active={id:nx.id,lvl:nx.lvl,start:nextStart||Date.now(),dur:nx.dur}; } else researchState().active=null; }
  function enqueueResearch(id){ const m=META.find(x=>x.id===id); if(!m) return false; const q=(researchState().queue=researchState().queue||[]); if(q.length>=5) return false;
    const a=researchActive(), pend=queuedCount(id)+((a&&a.id===id)?1:0), lvl=metaLvl(id)+pend; if(lvl>=m.max) return false;
    const cost=metaCost(m,lvl); if((meta.chips||0)<cost) return false; meta.chips-=cost; q.push({id,lvl,dur:metaDuration(m,lvl)}); saveMeta(); return true; }
  function finishResearch(nextStart){ const a=researchActive(); if(!a) return null; meta.lvl=meta.lvl||{}; meta.lvl[a.id]=a.lvl+1; applyResearchUnlock(a.id);
    if(achToasts.length<6){ const m=META.find(x=>x.id===a.id); achToasts.push({kind:'research',id:a.id,t:3.4,name:m?shopName(m):a.id,lvl:a.lvl+1}); if(achToasts.length<=1){ try{ beep(720,0.08,'square',0.16); setTimeout(()=>beep(1080,0.1,'square',0.18),90); }catch(e){} vibe([18,26,18]); } }
    startNext(nextStart||Date.now()); saveMeta(); return a.id; }
  function accelerateResearch(){ const a=researchActive(); if(!a) return false; const c=accelerateCost(); if((meta.chips||0)<c) return false; meta.chips-=c; finishResearch(Date.now()); return true; }   // beschleunigt → nächstes Projekt startet JETZT
  function tickResearch(){ let r=null,g=0; while(researchDone()&&g++<60){ const a=researchActive(); r=finishResearch(a.start+a.dur*1000); } return r; }   // drainen: mehrere offline abgelaufene Projekte korrekt hintereinander abschließen
  // Forschungs-Timer abgeschafft (Sofort-Kauf): evtl. noch laufende/eingereihte Forschung aus ALTEN Speicherständen sofort abschließen (war ja bereits bezahlt → Stufen gutschreiben), dann State leeren. Verhindert tote Timer-/Accelerate-UI.
  function drainResearchInstant(){ const rs=researchState(); let changed=false,g=0;
    while(rs.active&&g++<80){ const a=rs.active; meta.lvl=meta.lvl||{}; meta.lvl[a.id]=a.lvl+1; applyResearchUnlock(a.id); changed=true;
      const q=rs.queue||[]; rs.active=q.length?q.shift():null; }
    if(rs.queue&&rs.queue.length){ rs.queue=[]; changed=true; }
    if(changed) saveMeta(); return changed; }
  // Roguelite: Start-Skillpunkte je Run = Basis 1 + Veteran-Bonus (freikaufbar). Der Run-Build wird beim Game Over zurückgesetzt.
  const starterSP=()=>1+metaLvl('veteran');
  // Günstigstes noch nicht ausgereiztes Werkstatt-Upgrade → Karotte auf dem Game-Over-Screen
  function nextUnlock(){ let best=null; for(const m of META){ if(m.id==='pxpack'||m.id==='pxglow') continue; const lv=metaLvl(m.id); if(lv>=m.max) continue; const c=metaCost(m,lv); if(!best||c<best.cost) best={ico:m.ico,name:shopName(m),cost:c}; } return best; }
  function chipMult(){ return 1+0.12*metaLvl('rich'); }
  // Fork-Stufen werden in der Werkstatt freigeschaltet (fu_<waffe> = Anzahl freier Fork-Slots, 0..4)
  const FORKI={f1:1,f2:2,f3:3,f4:4};
  // Alle Fork-Stufen werden in der Werkstatt freigeschaltet (fu_<id> = 0..4) – vorher nicht wählbar
  const forkShopOpen=()=>true;   // Fork-Stufen nur noch per Skillpunkt – kein Coin-Vorkauf mehr (eine Hürde)
  // Werkstatt-Kategorien (für Tab-UI)
  function shopCat(id){ if(id.indexOf('sy_')===0||id==='synslot') return 'synergy';
    if(id==='pxpack'||id==='pxglow') return 'cosmetic';   // im Editor verkauft, nicht als generische Karte
    if(id.indexOf('bp_')===0||id.indexOf('fu_')===0) return 'weapons';   // Tab ausgeblendet (redundant zum Hangar – Kauf inline im Loadout)
    if(id==='shield'||id==='tough'||id==='solid'||id==='reach'||id==='slot'||id==='veteran') return 'ship';   // Start-Boni (inkl. Veteran = +Start-Skillpunkte) im Schiff-Tab kaufbar
    if(id==='wcore'||id==='wtempo'||id==='critcore'||id==='critdmgcore') return 'power';
    return 'economy'; }
  // Werkstatt täglich zurücksetzen (Schalter); Trophäen bleiben immer
  function dailyShopCheck(){ if(opt.dailyShop && meta.shopDate!==dailyLabel()){ meta.chips=0; meta.lvl={}; meta.research={active:null}; meta.shopDate=dailyLabel(); saveMeta(); } }   // laufende/eingereihte Forschung mit zurücksetzen, sonst schreibt sie nach dem Reset geschenkte Stufen in das geleerte meta.lvl
  const weaponUnlocked=id=> id==='blaster'||!!(meta.unlocks&&meta.unlocks['w:'+id])||metaLvl('bp_'+id)>0;   // Waffe ENTDECKT: per Loot-Fund (meta.unlocks) – Blaster immer, Alt-Bestand (gebaut/Bauplan) bleibt gültig
  // Einmalige Migration: bereits gebaute Loadouts behalten ihre Waffen/Forks (sonst würden alte Builds beim Aktivieren der Coin-Sperre verschwinden)
  function migrateCoinSkills(){ if(meta.mig_cs) return; meta.mig_cs=1; meta.lvl=meta.lvl||{};
    const L=meta.loadout; if(L&&L.w){ for(const id in L.w){ if(!WID[id]) continue; const s=L.w[id]||{};
      if(id!=='blaster') meta.lvl['bp_'+id]=Math.max(meta.lvl['bp_'+id]||0,1);   // gebaute Waffe → Bauplan gilt als gekauft
      let forks=0; for(const f of ['f1','f2','f3','f4']) if(s[f]) forks++;
      if(forks>0) meta.lvl['fu_'+id]=Math.max(meta.lvl['fu_'+id]||0,forks); } }   // bereits gewählte Fork-Stufen freigeschaltet
    saveMeta(); }
  // Einmalig: aktive Synergien im gespeicherten Loadout gelten als freigekauft (sonst verschwinden alte Fusionen beim Aktivieren der Synergie-Coin-Sperre)
  function migrateSynUnlock(){ if(meta.mig_syn) return; meta.mig_syn=1; meta.lvl=meta.lvl||{};
    const L=meta.loadout; if(L&&Array.isArray(L.syn)){ for(const sid of L.syn) if(SID[sid]) meta.lvl['sy_'+sid]=Math.max(meta.lvl['sy_'+sid]||0,1); }
    saveMeta(); }
  // Einmalig (Fusionen 2.0): während der Auto-Phase aktive Synergien (beide Waffen im gespeicherten Loadout) gelten als gekauft – kein Bestand wird enteignet
  function migrateSynUnlock2(){ if(meta.mig_syn2) return; meta.mig_syn2=1; meta.lvl=meta.lvl||{};
    const L=meta.loadout; if(L&&L.w){ for(const sy of SYNERGIES){ if(L.w[sy.pair[0]]&&L.w[sy.pair[1]]) meta.lvl['sy_'+sy.id]=Math.max(meta.lvl['sy_'+sy.id]||0,1); } }
    saveMeta(); }
  // Einmalig: bereits gebaute Waffen/Forks gelten als schon freigeschaltet → kein erneuter Coin-Preis beim Re-/Freischalten (Einmal-Senke gilt rückwirkend)
  function migrateOneTimeUnlock(){ if(meta.mig_otu) return; meta.mig_otu=1; if(!meta.unlocks) meta.unlocks={};
    const L=meta.loadout; if(L&&L.w){ for(const id in L.w){ if(!WID[id]) continue; meta.unlocks['w:'+id]=1; const s=L.w[id]||{};
      for(const f of ['f1','f2','f3','f4']) if(s[f]) meta.unlocks['f:'+id+':'+s[f]]=1; } }
    saveMeta(); }
  function applyMeta(){
    migrateCoinSkills();                                   // einmalig: alte Builds vor der Coin-Sperre retten
    migrateSynUnlock();                                    // einmalig: aktive Synergien grandfathern
    migrateSynUnlock2();                                   // einmalig (Fusionen 2.0): zuletzt aktive Paar-Synergien als gekauft übernehmen
    migrateOneTimeUnlock();                                // einmalig: gebaute Waffen/Forks als freigeschaltet markieren
    arsenal.slots=3+metaLvl('slot');                       // Werkstatt: Modul-Slots (max +2 → 5)
    arsenal.w={};
    // HANGAR: gespeichertes Loadout laden (bleibt zwischen Runs erhalten – kein Neu-Aufbau jedes Mal)
    if(opt.guns){ const L=meta.loadout;
      if(L && L.w){ for(const id in L.w){ if(WID[id] && weaponUnlocked(id) && Object.keys(arsenal.w).length<arsenal.slots){ const s=L.w[id]||{};
        const lvl=Math.max(1,Math.min(5,s.lvl||1));
        arsenal.w[id]={lvl,f1:s.f1||null,f2:s.f2||null,f3:s.f3||null,f4:s.f4||null,spent:(lvl-1)+(id==='blaster'?0:1)}; } } }   // spent = investierte Skillpunkte (für Respec-Rückerstattung)
      if(!Object.keys(arsenal.w).length) arsenal.w.blaster={lvl:1,f1:null,f2:null,f3:null,f4:null,spent:0};   // Mindest-Loadout: Blaster (gratis)
      mods.oc=(L&&L.oc)||0; skillPts=Math.max(0,meta.sp|0);
      // Gespeichertes Start-Loadout: bevorzugte Waffen automatisch einrüsten – kostet je 1 Skillpunkt (wie manuell, kein Gratis-Boost). Greift nur beim frischen Roguelite-Start (kein resumtes Loadout).
      if(!L && mode!=='zen' && Array.isArray(meta.startKit)){ for(const id of meta.startKit){ if(id==='blaster'||arsenal.w[id]||!WID[id]||!weaponUnlocked(id)) continue; if(Object.keys(arsenal.w).length>=arsenal.slots||skillPts<=0) break; arsenal.w[id]={lvl:1,f1:null,f2:null,f3:null,f4:null,spent:1}; skillPts--; } }
      }   // persistente Skillpunkte (Boss-/Zufalls-Drops, kaufbar); aktive Fusionen setzt recalcArsenal() aus meta.synSel
    if(opt.guns && mode==='zen'){ arsenal.slots=WEAPONS.length;   // ZEN = Sandbox: alle Waffen VOLL ausgebaut (Lvl 5, alle 4 Skill-Pfade zufällig) statt nackt auf Lvl 1
      for(const w of WEAPONS) arsenal.w[w.id]={lvl:5, f1:w.forks[0][Math.random()<0.5?0:1], f2:w.forks[1][Math.random()<0.5?0:1], f3:w.forks[2][Math.random()<0.5?0:1], f4:w.forks[3][Math.random()<0.5?0:1]};
      skillPts=0; }
    const sh=metaLvl('shield'); if(sh) shields=Math.min(shields+sh,5);
    const to=metaLvl('tough'); if(to) lives=Math.min(lives+to,6);
    const so=metaLvl('solid'); if(so){ mods.playerR*=Math.pow(0.95,so); player.r=mods.playerR; }
    const re=metaLvl('reach'); if(re) mods.nearRadius*=(1+0.09*re);
    const scn=metaLvl('score'); if(scn) mods.scoreMult*=(1+0.15*scn);
    const lu=metaLvl('luck'); if(lu) mods.powerupRate*=(1+0.10*lu);
    // (Veteran-Start-Skillpunkte entfallen: Skillpunkte sind jetzt persistent → kein Pro-Run-Bonus)
    const wc=metaLvl('wcore');  if(wc) mods.wDmgMult=(mods.wDmgMult||1)*(1+0.06*wc);   // ALLE Waffen mehr Schaden
    const wt=metaLvl('wtempo'); if(wt) mods.wRate=(mods.wRate||1)*(1+0.05*wt);         // ALLE Waffen schneller
    const cr=metaLvl('critcore'); if(cr) mods.critBase=(mods.critBase||0)+0.03*cr;     // Krit-Basis
    // Krit-Schaden (critdmgcore) fließt jetzt zentral über critDmgCurve() in recalcArsenal() ein
    recalcArsenal();
  }
  // ---------- Erfolge / Achievements ----------
  const ACH=[
    {id:'firstNear',ico:'😎'},{id:'combo10',ico:'🔗'},{id:'combo20',ico:'⚡'},{id:'combo30',ico:'👑'},
    {id:'perfect10',ico:'🎯'},{id:'boss5',ico:'🌊'},{id:'mega',ico:'🛸'},{id:'won',ico:'🏆'},
    {id:'madness',ico:'☣'},{id:'orbs1000',ico:'🔷'},{id:'chips10k',ico:'🪙'},{id:'allmodes',ico:'🎮'},
    {id:'curse',ico:'🎲'},{id:'daily',ico:'🗓'},{id:'clutch',ico:'😮‍💨'}
  ];
  const ACHTR={
    de:{firstNear:['Hauchzart','Erster Near-Miss'],combo10:['Im Flow','Combo x10'],combo20:['Brandheiß','Combo x20'],combo30:['Göttlich','Combo x30'],perfect10:['Millimeterarbeit','10× PERFEKT'],boss5:['Wellenbrecher','Boss 5 erreicht'],mega:['Drachentöter','Mega-Boss besiegt'],won:['Durchgespielt','Den Endgegner besiegt'],madness:['Wahnsinnig','60 s im Wahnsinn-Modus'],orbs1000:['Sammler','1.000 Orbs gesamt'],chips10k:['Reich','10.000 Chips verdient'],allmodes:['Vielspieler','Alle 3 Modi gespielt'],curse:['Risikofreudig','Einen Fluch eingesammelt'],daily:['Stammgast','Daily gespielt'],clutch:['Haarscharf','Mitten im Sprung knapp entkommen']},
    en:{firstNear:['Hair’s Breadth','First near-miss'],combo10:['In the Flow','Combo x10'],combo20:['Red Hot','Combo x20'],combo30:['Godlike','Combo x30'],perfect10:['Precision','10× PERFECT'],boss5:['Wavebreaker','Reached boss 5'],mega:['Dragonslayer','Defeated a mega-boss'],won:['Completed','Beat the final boss'],madness:['Unhinged','60 s in madness mode'],orbs1000:['Collector','1,000 orbs total'],chips10k:['Rich','Earned 10,000 chips'],allmodes:['All-Rounder','Played all 3 modes'],curse:['Risk-Taker','Grabbed a curse'],daily:['Regular','Played the daily'],clutch:['Clutch','Slipped through danger mid-jump']},
    fr:{firstNear:['À un cheveu','Premier near-miss'],combo10:['Dans le flow','Combo x10'],combo20:['Brûlant','Combo x20'],combo30:['Divin','Combo x30'],perfect10:['Précision','10× PARFAIT'],boss5:['Brise-vagues','Boss 5 atteint'],mega:['Tueur de dragon','Méga-boss vaincu'],won:['Terminé','Boss final vaincu'],madness:['Cinglé','60 s en mode folie'],orbs1000:['Collectionneur','1 000 orbes au total'],chips10k:['Riche','10 000 chips gagnés'],allmodes:['Polyvalent','Joué les 3 modes'],curse:['Téméraire','Ramassé une malédiction'],daily:['Habitué','Joué le daily'],clutch:['Clutch','Esquive en plein saut']}
  };
  const achName=id=>((ACHTR[lang]&&ACHTR[lang][id])||ACHTR.en[id]||[id])[0];
  const achDesc=id=>(((ACHTR[lang]&&ACHTR[lang][id])||ACHTR.en[id]||['',''])[1])||'';
  const STATTR={
    de:{stats:'STATISTIK',runs:'Runs',orbs:'Münzen',near:'Near-Misses',perfect:'Perfekt',bosses:'Bosse',maxCombo:'Top-Combo',maxBoss:'Top-Boss',chipsTotal:'Chips gesamt',won:'Siege'},
    en:{stats:'STATISTICS',runs:'Runs',orbs:'Coins',near:'Near-misses',perfect:'Perfect',bosses:'Bosses',maxCombo:'Top combo',maxBoss:'Top boss',chipsTotal:'Total chips',won:'Wins'},
    fr:{stats:'STATISTIQUES',runs:'Parties',orbs:'Pièces',near:'Near-miss',perfect:'Parfait',bosses:'Boss',maxCombo:'Combo max',maxBoss:'Boss max',chipsTotal:'Chips total',won:'Victoires'}
  };
  const stTxt=k=>((STATTR[lang]&&STATTR[lang][k])||STATTR.en[k]||k);
  let achToasts=[];
  function unlockSkin(id){ meta.skins=meta.skins||{}; if(!meta.skins[id]){ meta.skins[id]=1; saveMeta(); } } // Phase 2
  function unlockAch(id){ if(meta.ach&&meta.ach[id]) return; meta.ach=meta.ach||{}; meta.ach[id]=1; saveMeta();
    achToasts.push({id,t:3.4}); try{ beep(880,0.09,'square',0.18); setTimeout(()=>beep(1320,0.12,'square',0.2),100); }catch(e){} vibe([20,30,20]);
    if(id==='won') unlockSkin('gold'); if(id==='mega') unlockSkin('toxic'); if(id==='madness') unlockSkin('glitch'); }
  function checkComboAch(m){ if(m>=10)unlockAch('combo10'); if(m>=20)unlockAch('combo20'); if(m>=30)unlockAch('combo30'); }
  // ---------- Meilenstein-Leiter: feste Run-Ziele mit dauerhafter Chip-Belohnung (jeder einmalig) ----------
  const MILESTONES=[
    {id:'lvl5',type:'lvl',need:5,chips:60},{id:'lvl10',type:'lvl',need:10,chips:120},{id:'lvl15',type:'lvl',need:15,chips:220},{id:'lvl20',type:'lvl',need:20,chips:360},{id:'lvl30',type:'lvl',need:30,chips:650},
    {id:'boss1',type:'boss',need:1,chips:50},{id:'boss3',type:'boss',need:3,chips:150},{id:'boss5',type:'boss',need:5,chips:280},{id:'boss10',type:'boss',need:10,chips:650},
    {id:'sc25k',type:'score',need:25000,chips:120},{id:'sc50k',type:'score',need:50000,chips:260},{id:'sc100k',type:'score',need:100000,chips:550},
    {id:'win',type:'won',need:1,chips:350}
  ];
  const MSICO={lvl:'🚀',boss:'🌊',score:'💎',won:'🏆'};
  function msLabel(m){ if(m.type==='lvl') return t('level')+' '+m.need; if(m.type==='boss') return m.need+' '+t('bosses'); if(m.type==='score') return fmt(m.need)+' '+t('msPts'); return t('msWin'); }
  const bestScore=()=> Math.max(best.normal||0,best.hardcore||0,best.daily||0,best.zen||0);
  function msBest(m){ if(m.type==='lvl') return statN('maxLevel'); if(m.type==='boss') return statN('maxBoss'); if(m.type==='score') return bestScore(); return meta.won?1:0; }
  // Am Run-Ende prüfen: neu erreichte Meilensteine → Chips gutschreiben + zurückgeben (für die Anzeige)
  function checkMilestones(){ meta.ms=meta.ms||{}; const hit=[]; let chips=0;
    const cur={lvl:level||1,boss:runBosses||0,score:Math.round(score||0),won:wonThisRun?1:0};
    for(const m of MILESTONES){ if(meta.ms[m.id]) continue; if((cur[m.type]||0)>=m.need){ meta.ms[m.id]=1; chips+=m.chips; hit.push(m); } }
    if(chips) meta.chips=(meta.chips||0)+chips; return {chips,hit}; }
  // ---------- Lore/Story: zusammenhängende Meme-/Jugendsprache, die die Mechaniken nebenbei erklärt (jeder Beat einmalig) ----------
  // Setting: Du bist der letzte echte Vibe-Kern im abgestürzten Algorithmus. Alles drumherum ist NPC, Cringe & Hater. Bleib im Flow, sonst wirst du geratio't.
  const LORE={
    intro:{ de:['DER LETZTE ECHTE','Du bist der einzige echte Kern im abgestürzten Algorithmus. Der Rest sind NPCs. Bleib im Flow.'],
            en:['THE LAST REAL ONE','You’re the only real core left in a crashed algorithm. Everything else is an NPC. Stay in the flow.'],
            fr:['LE DERNIER VRAI','Tu es le seul vrai noyau dans un algorithme planté. Le reste, ce sont des NPC. Reste dans le flow.'] },
    weapon:{ de:['RIZZ AUFRÜSTEN','Waffen = Selbstbewusstsein. Reden bringt nix gegen Hater. Hol dir welche im Arsenal (💠).'],
             en:['GET SOME RIZZ','Weapons = confidence. Talking won’t stop the haters. Grab some in the Arsenal (💠).'],
             fr:['CHOPE DU RIZZ','Les armes = la confiance. Parler ne calme pas les haters. Prends-en dans l’Arsenal (💠).'] },
    fork:{ de:['SKILL ISSUE FIXEN','Spezialisieren: aus „mid" wird „kinda based". Pfade im Skillbaum wählen.'],
           en:['FIX THE SKILL ISSUE','Specialize: turn “mid” into “kinda based”. Pick paths in the skill tree.'],
           fr:['RÉPARE LE SKILL ISSUE','Spécialise-toi : de « mid » à « un peu based ». Choisis les voies dans l’arbre.'] },
    synergy:{ de:['FUSION = MAIN-CHARACTER-ENERGY','Zwei Waffen verschmelzen → absoluter Sigma-Move. Im Arsenal kombinieren.'],
              en:['FUSION = MAIN CHARACTER ENERGY','Two weapons merge → absolute sigma move. Combine in the Arsenal.'],
              fr:['FUSION = ÉNERGIE MAIN CHARACTER','Deux armes fusionnent → move sigma absolu. Combine dans l’Arsenal.'] },
    boss:{ de:['FINAL BOSS DETECTED','Ein riesiger Cringe-Lord wurde nie geblockt. Jetzt ist er sauer. Pure Ohio-Energie.'],
           en:['FINAL BOSS DETECTED','A huge cringe-lord never got blocked. Now he’s mad. Pure Ohio energy.'],
           fr:['BOSS FINAL DÉTECTÉ','Un énorme cringe-lord n’a jamais été bloqué. Il est vénère. Énergie Ohio pure.'] },
    upgrade:{ de:['LEVEL UP, NO CAP','Wähl eine Karte. Reue gehört dazu — wie beim dritten Energy.'],
              en:['LEVEL UP, NO CAP','Pick a card. Regret is part of it — like the third energy drink.'],
              fr:['LEVEL UP, NO CAP','Choisis une carte. Le regret fait partie du délire — comme le 3e energy.'] },
    lvl3:{ de:['STILL GANZ OK','Level 3. Schon mehr Runs überlebt als die meisten NPCs. Lowkey stolz.'],
           en:['STILL KINDA VALID','Level 3. Outlived most NPCs already. Lowkey proud.'],
           fr:['ENCORE VALIDE','Niveau 3. Déjà plus de runs que la plupart des NPC. Lowkey fier.'] },
    lvl6:{ de:['ES WIRD SPICY','Level 6. Der Algorithmus pusht dich jetzt härter. Bleib lock-in.'],
           en:['IT’S GETTING SPICY','Level 6. The algorithm is pushing you harder now. Stay locked in.'],
           fr:['ÇA DEVIENT SPICY','Niveau 6. L’algo te pousse plus fort maintenant. Reste lock-in.'] },
    lvl10:{ de:['ABSOLUTE LEGENDE','Level 10. Du bist jetzt Main Character. Sie machen Edits über dich.'],
            en:['ABSOLUTE LEGEND','Level 10. You’re the main character now. They make edits about you.'],
            fr:['LÉGENDE ABSOLUE','Niveau 10. T’es le main character. Ils font des edits sur toi.'] },
    relic:{ de:['SPLITTER DER GEFALLENEN','Jeder geplättete Gegner war mal ein Kern wie du. Was bleibt, sind leuchtende ✦-Relikte. Looten ist kein Diebstahl — es ist Recycling mit Style. Sie heißen dich Main Character. 💅'],
            en:['SHARDS OF THE FALLEN','Every enemy you smash was once a core like you. What’s left: glowing ✦ relics. Looting isn’t stealing — it’s recycling with drip. They crown you main character. 💅'],
            fr:['ÉCLATS DES TOMBÉS','Chaque ennemi éclaté était un noyau comme toi. Ce qui reste : des reliques ✦ lumineuses. Looter, c’est pas voler — c’est du recyclage stylé. 💅'] },
    vault:{ de:['DER TRESOR DES THRONS','Goldene Tresore aus der alten Welt — vollgestopft mit Beute, die niemand mehr abholt. Du schon. Greedy? Nein. Verdient. Renn hin, bevor er vom Bildschirm dippt.'],
            en:['THE THRONE’S VAULT','Golden vaults from the old world — packed with loot nobody’s claiming. You are. Greedy? Nah. Earned. Go grab it before it dips off-screen.'],
            fr:['LE COFFRE DU TRÔNE','Des coffres dorés de l’ancien monde — bourrés de butin que personne ne réclame. Toi si. Greedy ? Non. Mérité. Fonce avant qu’il quitte l’écran.'] }
  };
  let loreReturn=S.PLAY;
  function lore(id){ const e=LORE[id]; if(!e||(meta.seen&&meta.seen['lore_'+id])) return; meta.seen=meta.seen||{}; meta.seen['lore_'+id]=1; saveMeta(); showLore(id); }
  // Story-Beat als pausierendes, gut lesbares Overlay (friert das Spiel ein → in Ruhe lesen, tippen zum Weiter)
  function showLore(id){ const e=LORE[id]; if(!e) return; const tx=(e[lang]||e.en);
    const tEl=document.getElementById('loreHd'), bEl=document.getElementById('loreBody'), cEl=document.getElementById('loreCont');
    if(tEl) tEl.textContent='📖 '+tx[0]; if(bEl) bEl.textContent=tx[1]; if(cEl) cEl.textContent=t('loreNext');
    loreReturn=state; if(state===S.PLAY) state=S.PAUSE;   // im Spiel: einfrieren (Loop überspringt update/draw)
    const sc=document.getElementById('lore'); if(sc){ sc.classList.remove('hidden'); sc.scrollTop=0; }
    try{ beep(523,0.09,'sine',0.2); setTimeout(()=>beep(392,0.11,'sine',0.18),120); }catch(_){} }
  function dismissLore(){ const sc=document.getElementById('lore'); if(!sc||sc.classList.contains('hidden')) return; sc.classList.add('hidden');
    // Ghost-Tap abfangen: die Lore schließt bei 'pointerdown', der vom selben Tap erzeugte
    // 'click' würde sonst die freigelegte Upgrade-Karte darunter sofort auswählen.
    const eat=ev=>{ ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click',eat,{capture:true,once:true});
    setTimeout(()=>{ try{ window.removeEventListener('click',eat,{capture:true}); }catch(_){} },500);
    state=loreReturn; if(loreReturn===S.PLAY){ lastT=performance.now(); if(player){ tgt.x=player.x; tgt.y=player.y; } inputSuppressUntil=performance.now()+320; } try{ beep(440,0.06,'square',0.16); }catch(_){} }   // Click-Through-Schutz: Schiff bleibt stehen
  let elapsed, spawnT, orbT, powerupT, coinT, difficulty, shake, flash, flashColor, nearGlow, nearCount, deathFlash=0;
  let deathT=0, deathX=0, deathY=0, deathGather=false, deathGlow='#ff7a1a', deathMsg='', overShown=false;   // Abgang: Timer + Loser-Materialisierung + Spott-Nachricht; overShown = Over-Panel sichtbar
  let lastBossName='', lastRunRecord=false;   // für die teilbare Game-Over-Karte: zuletzt getroffener Meme-Boss + Rekord-Flag
  let level, levelTimer, levelDuration, unlocked, nextUpgradeAt, upStep;
  let bossActive, bossTimer, bossPhaseT, bossNumber, laserSpawnT, bossIntroT=0;
  let banner, effects, shields, invuln, mods, upgradeCounts, lives, commentT, egg67done, egg67T, mirrorOn=false, deathCause='';
  let runContinues=0, pendingContinue=false;   // Weiterleben-Continue: unbegrenzt anbietbar, jedes Mal doppelt so teuer (2^runContinues)
  const JUMP_R=140;      // Sprung-Dash: Hüpf-/Unverwundbarkeits-Phase, vaultet aus der Klemme (Cooldown/Ladungen/Dauer via mods)
  const JUMP_RANGE=340;  // max. Sprungweite (× jumpVault): Tap weiter weg → Schiff kommt bei dieser Reichweite auf (kurz)
  let jumpCharge=0, jumpStock=1, jumping=0, jumpClutch=0, jumpClutchFired=false, jumpSeq=0;
  let rankIdx=0;   // Rang-Beförderungen
  let missions=[], runJumps=0, runLoot=0;   // Run-Missionen + eingesammelte Beute-Drops
  let breatherT=0, breatherActive=0, chestT=0;   // Feel-Good: Verschnaufpausen · chestT = Beute-Truhen-Timer
  // (HYPE-Meter & Takt-Ausweich-Bonus entfernt – fühlte sich random/unnötig an)
  let mkCount=0, mkTimer=0;   // Multikill-Feedback (sichtbare Staerke bei hoher DPS)
  let coachQueue=[], coachCd=0, coachCard=null, coachPause=false, coachBtn=null;   // Onboarding-Coach: gestaffelte, einmalige Lektionen (nie zwei gleichzeitig); friert beim Erklären ein. coachBtn = Trefferzone des WEITER-Buttons
  let flungT=0, flungX=0, flungY=0;   // Boss-Katapult: kurzer Steuer-Lock, der den Spieler nach dem Boss-Stomp in Sicherheit schleudert
  let jumpReadyT=0;   // kleine Top-Meldung, sobald der Sprung wieder verfügbar ist
  let jumpFromX=0, jumpFromY=0, jumpToX=0, jumpToY=0;   // gerichteter Sprung: deterministische Flugbahn Start→Landepunkt
  let activeCurses=[];   // zeitlich begrenzte Flüche: [{id,t,max}] – Effekt in mods gebacken, off() macht ihn rückgängig
  const MIR_DUR=30;   // Spiegelwelt-Fluch: einmalig 30s gespiegelt, dann vorbei (Countdown im Effekt-HUD)
  let comboTime=0, comboTimeMax=3.4;                 // Combo-Decay-Timer
  let beatIdx=0, beatPulse=0, spawnQueued=false, orbQueued=false; // Beat-Sync
  let daily=false;                                    // Daily-Challenge aktiv?
  let director=0.5, overdrive=false;                  // DDA + Combo-Overdrive
  // Selbstregelnder Flow-Regler: flowI faehrt gedaempft mit der Live-Performance (director) mit + ein zwischen-Runs gelerntes Skill-Offset.
  // Legt sich gedeckelt [0.8..1.26] auf Tempo & Elite-Haeufigkeit → haelt den Spieler im 'gerade so machbar'-Korridor, egal welcher Skill/Build.
  let flowI=1, skillBias=0;   // DDA-Regler-Overlay nur für Dev: opt.dbg ist im fertigen Spiel nicht erreichbar (kein F8/Code, wird nie als true geladen) – zum Debuggen manuell in der Konsole opt.dbg=true setzen
  let endless=false, madness=0, wonThisRun=false, laserFinal=false; // Finale + Wahnsinn-Modus
  let runOrbs=0, runPerfect=0, runBosses=0, madnessTime=0, runMaxMult=1, runSPgain=0, runHits=0;  // Statistik pro Run (runHits = kassierte Treffer → Schwierigkeits-Signal)
  let inputDirty=false, idleStretch=0, runIdleMax=0, runIdleAcc=0;   // Passivität: längste eingabefreie Überlebens-Strecke (Camping-/„zu leicht"-Signal)
  let onbDrops=0;   // Onboarding: wie viele der 3 Starter-Skillpunkte in Level 1 schon gedroppt sind
  let runChipsPaid=0;   // Chips aus stillem Score-Trickle (Backbone-Ökonomie)
  let runChipsEarned=0; // Chips aus sichtbaren Events (Orbs/Combos/Boss) – Dopamin-Quelle
  let shipSeed=1;                                      // Stil-Seed des Spieler-Raumschiffs
  let shipSprite=null, shipSig='';                     // gebackener Pixel-Sprite + Signatur
  let opt=loadOpt();                                  // Einstellungen (Screenshake/Effekte/Flüche)
  // Lautstärke 0..1: alte Boolean-Werte (true/false) + neue Zahlen migrieren
  function volNum(v){ return Math.max(0,Math.min(1, v===true?1:(v===false?0:(+v||0)))); }
  function loadOpt(){ try{ const r=JSON.parse(localStorage.getItem('thronerush_opt')); if(r&&typeof r==='object') return {shake:r.shake==null?1:r.shake,fx:r.fx==null?1:r.fx,madnessFx:r.madnessFx==null?true:!!r.madnessFx,curses:r.curses==null?true:r.curses,guns:r.guns==null?true:r.guns,dmg:r.dmg==null?true:r.dmg,dailyShop:r.dailyShop==null?true:r.dailyShop,telemetry:r.telemetry==null?false:!!r.telemetry,tlmAsked:r.tlmAsked==null?false:!!r.tlmAsked,dbg:false,
    music:r.music==null?(r.muted?0:1):volNum(r.music), sfx:r.sfx==null?(r.muted?0:1):volNum(r.sfx), fullscreen:r.fullscreen==null?true:r.fullscreen, nick:typeof r.nick==='string'?r.nick:''}; }catch(e){} return {shake:1,fx:1,madnessFx:true,curses:true,guns:true,dmg:true,dailyShop:true,telemetry:false,tlmAsked:false,dbg:false,music:1,sfx:1,fullscreen:true,nick:''}; }
  function saveOpt(){ try{ localStorage.setItem('thronerush_opt',JSON.stringify(opt)); }catch(e){} }

  // ---------- Audio ----------
  let actx=null, masterGain=null, musicBus=null, sfxGain=null, musicGain=null, musicDelay=null, vibLFO=null, vibGain=null;
  let analyser=null, waveData=null;   // Audio-Abgriff für den Sonnen-Visualizer (Wellenform der Musik)
  function ensureCtx(){
    if(actx) return true;
    try{ actx=new (window.AudioContext||window.webkitAudioContext)();
      masterGain=actx.createGain(); masterGain.gain.value=0.9; masterGain.connect(actx.destination);
      // zwei getrennte Busse: Musik + Game-Sound (SFX) – je eigene Option
      musicBus=actx.createGain(); musicBus.gain.value=volNum(opt.music); musicBus.connect(masterGain);
      sfxGain=actx.createGain(); sfxGain.gain.value=volNum(opt.sfx); sfxGain.connect(masterGain);
      musicGain=actx.createGain(); musicGain.gain.value=0.42; musicGain.connect(musicBus);
      analyser=actx.createAnalyser(); analyser.fftSize=256; analyser.smoothingTimeConstant=0.6; musicGain.connect(analyser); // Seiten-Abgriff (Wellenform), kein Audio-Ausgang
      waveData=new Uint8Array(analyser.fftSize);
      // Synthwave-Echo-Bus (tempo-naher Delay mit dunklem Feedback) → Tiefe statt trockener Sound. Dezent gehalten, sonst „hallig/verwaschen".
      musicDelay=actx.createDelay(1.2); musicDelay.delayTime.value=0.315;
      const dfb=actx.createGain(); dfb.gain.value=0.27;
      const dlp=actx.createBiquadFilter(); dlp.type='lowpass'; dlp.frequency.value=2600;
      const dwet=actx.createGain(); dwet.gain.value=0.45;
      musicDelay.connect(dlp); dlp.connect(dfb); dfb.connect(musicDelay); musicDelay.connect(dwet); dwet.connect(musicBus);
      // Vibrato-LFO für die Lead-Stimmen (leichtes Leben/Chorus)
      vibLFO=actx.createOscillator(); vibLFO.type='sine'; vibLFO.frequency.value=5.2;
      vibGain=actx.createGain(); vibGain.gain.value=5.5; vibLFO.connect(vibGain); vibLFO.start();
      return true;
    }catch(e){ actx=null; return false; }
  }
  function unlockAudio(){
    if(!ensureCtx()) return;
    try{ if(actx.state==='suspended') actx.resume();
      const b=actx.createBuffer(1,1,22050), s=actx.createBufferSource(); s.buffer=b; s.connect(actx.destination); s.start(0);
    }catch(e){}
    startMusic();
    const sh=document.getElementById('soundHint'); if(sh) sh.style.display='none';   // Hinweis nach erster Geste entfernen
  }
  ['pointerdown','touchstart','mousedown','keydown','click'].forEach(ev=>window.addEventListener(ev,unlockAudio,{passive:true}));

  function beep(freq,dur,type='sine',vol=0.4,slide=0){
    if(!actx||!opt.sfx) return;
    try{ const o=actx.createOscillator(), g=actx.createGain();
      o.type=type; o.frequency.setValueAtTime(Math.max(20,freq),actx.currentTime);
      if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),actx.currentTime+dur);
      g.gain.setValueAtTime(vol,actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+dur);
      o.connect(g); g.connect(sfxGain); o.start(); o.stop(actx.currentTime+dur);
    }catch(e){}
  }
  const sfxOrb=c=>{ if(sfxGate('orb',45)) beep(440+Math.min(c,20)*40,0.12,'triangle',0.32); };
  const sfxCoin=()=>{ if(sfxGate('coin',30)){ beep(988,0.06,'square',0.26); setTimeout(()=>beep(1319,0.13,'square',0.3),58); } };   // Super-Mario-artiger Münz-Sound: B5 → E6
  const sfxNear=()=>{ if(sfxGate('near',70)) beep(900,0.07,'sine',0.18,400); };
  const sfxStart=()=>{beep(523,0.09,'square',0.3);setTimeout(()=>beep(784,0.12,'square',0.3),90);};
  function sfxCrash(){beep(180,0.5,'sawtooth',0.5,-140);beep(90,0.6,'square',0.4,-50);}
  function duckMusic(dur){ if(!musicGain||!actx) return; const t=actx.currentTime;
    musicGain.gain.cancelScheduledValues(t); musicGain.gain.setValueAtTime(musicGain.gain.value,t);
    musicGain.gain.linearRampToValueAtTime(0.06,t+0.08); musicGain.gain.linearRampToValueAtTime(0.42,t+dur); }
  function sfxGameOver(){ if(!actx||!opt.sfx) return;
    beep(160,0.45,'sawtooth',0.5,-90);                 // Crash-Boom
    beep(70,0.55,'square',0.4,-25);
    const notes=[[466,160],[415,440],[392,720],[294,1040]]; // absteigend: "wah wah wah waaah"
    notes.forEach(([f,delay],i)=>{ const last=i===notes.length-1;
      setTimeout(()=>{ beep(f,last?0.7:0.34,'sawtooth',0.42,-22); beep(f*0.5,last?0.7:0.34,'square',0.16,-12); }, delay); });
    setTimeout(()=>{ beep(98,0.7,'square',0.4,-40); beep(196,0.7,'triangle',0.18,-30); },1340); // tiefer Schluss-Thud
  }
  function sfxBoss(){beep(140,0.25,'square',0.4,120);beep(70,0.4,'sawtooth',0.35,40);}
  function sfxLaugh(){ [0,120,235,345,450].forEach((d,i)=>setTimeout(()=>{ const f=300-i*22; beep(f,0.10,'square',0.22,-50); beep(f*0.5,0.10,'triangle',0.13,-25); },d)); } // höhnisches „ha-ha-ha"
  function sfxWin(){beep(523,0.12,'triangle',0.4);setTimeout(()=>beep(784,0.18,'triangle',0.4),110);}
  const sfxWarn=()=>beep(760,0.05,'square',0.12);
  const sfxFire=()=>beep(120,0.35,'sawtooth',0.4,-50);
  const sfxPow=()=>{beep(660,0.08,'square',0.3);setTimeout(()=>beep(990,0.12,'square',0.3),70);};
  const sfxLevel=()=>{beep(523,0.08,'square',0.3);setTimeout(()=>beep(659,0.08,'square',0.3),80);setTimeout(()=>beep(880,0.14,'square',0.3),160);};
  const sfxShieldBreak=()=>beep(300,0.25,'sawtooth',0.35,-150);
  const sfxUpgrade=()=>{beep(440,0.1,'triangle',0.3);setTimeout(()=>beep(660,0.1,'triangle',0.3),90);setTimeout(()=>beep(880,0.16,'triangle',0.35),180);};
  let shootTick=0;
  // SFX-Drossel: begrenzt die Wiederholrate eines Sounds (gegen „Rauschwand" bei hoher Schuss-/Killfrequenz im Endgame)
  const _sfxT={}; function sfxGate(key,ms){ const n=(typeof performance!=='undefined'&&performance.now)?performance.now():Date.now(); if(n-(_sfxT[key]||0)<ms) return false; _sfxT[key]=n; return true; }
  function sfxShoot(){ if(!sfxGate('shoot',58)) return; shootTick^=1; const lp=Math.min(300,((level||1)-1)*11); beep(shootTick?900+lp:980+lp,0.03,'square',0.06,260); } // gedrosselt (~17/s); Tonhöhe steigt mit Level = Eskalations-Gefühl
  function sfxKill(){ if(!sfxGate('kill',50)) return; beep(360,0.12,'square',0.2,-180); beep(140,0.18,'sawtooth',0.16,-60); } // gedrosselt (~20/s)
  // ---- Boss-Tod-Sounds (je nach Abgangs-Animation) ----
  function sfxBoom(){ beep(120,0.55,'square',0.5,-80); beep(60,0.7,'sawtooth',0.42,-34); beep(220,0.3,'triangle',0.3,-160);
    for(let i=0;i<5;i++) setTimeout(()=>beep(rand(80,260),0.06,'square',0.18,-rand(20,90)),i*22); } // Donner + Geprassel
  // Riesen-Explosion zum Game-Over: tiefer, langer Nuklear-Rumms + Nachhall
  function sfxDeathBlast(p){ p=p||1; beep(95*p,0.9,'sawtooth',0.5,-80); beep(46*p,1.15,'square',0.46,-28); beep(210*p,0.5,'triangle',0.36,-250);
    setTimeout(()=>beep(150*p,0.45,'triangle',0.3,-200),80); setTimeout(()=>beep(64*p,0.75,'sawtooth',0.42,-44),150); setTimeout(()=>beep(38*p,0.85,'sine',0.36,-20),320);
    for(let i=0;i<9;i++) setTimeout(()=>beep(rand(70,300),0.06,'square',0.2,-rand(30,120)),i*28); }   // langes Geprassel/Funken (Pitch p variiert)
  function sfxMaterialize(){ beep(150,0.5,'sine',0.16,1000); setTimeout(()=>beep(320,0.3,'triangle',0.14,640),120); setTimeout(()=>beep(880,0.12,'square',0.13,180),370); }   // aufsteigender Re-Assemble-Sweep + Ping
  function sfxBloat(){ beep(180,1.0,'sawtooth',0.26,520); beep(360,1.0,'square',0.12,1040);            // ansteigendes Aufpump-Pfeifen
    for(let i=0;i<6;i++) setTimeout(()=>beep(300+i*70,0.05,'triangle',0.12),i*180); }
  function sfxBalloonPop(){ beep(1300,0.04,'square',0.32,-1000); beep(420,0.14,'sawtooth',0.34,-260);   // Knall
    beep(170,0.2,'square',0.26,-90); for(let i=0;i<4;i++) setTimeout(()=>beep(rand(200,600),0.05,'square',0.16,-rand(80,200)),i*18); } // Splatter
  function sfxMeltdown(){ for(let i=0;i<10;i++) setTimeout(()=>beep(rand(700,2200),0.04,'square',0.14,-rand(100,400)),i*70); // E-Knistern
    setTimeout(()=>{ beep(400,0.6,'sawtooth',0.34,-360); beep(120,0.7,'square',0.3,-70); },720); }      // Power-Down
  function sfxImplode(){ beep(900,0.55,'sine',0.32,-760); beep(1300,0.5,'triangle',0.18,-1000);          // einsaugendes Vwoop
    setTimeout(()=>{ beep(1800,0.1,'triangle',0.32,200); beep(120,0.4,'square',0.34,-50); },560); }      // Ping + Bass-Hit

  // ---------- Chiptune-Engine (Original-Komposition, loopt in Variationen) ----------
  const BPM=142;
  let musicOn=false, schedTimer=null, step16=0, nextStepTime=0, loopCount=0, secPerStep=60/(BPM*4);
  let musicShift=0;                                  // globale Transposition (pro Level andere Tonart)
  const midiF=n=>440*Math.pow(2,(n-69+musicShift)/12);
  const levelKey=lv=>{ let s=((Math.max(1,lv)-1)*5)%12; if(s>6) s-=12; return s; };  // Quartenzirkel, ±6 Halbtöne → jedes Level klar andere Tonart
  // Lead A – PROLOG: eigenständige Melodie, die den Stufengang-Bogen von „Ode an die Freude" nur ANDEUTET (nicht kopiert)
  const LEAD1=[
    {s:0,n:72,d:2},{s:2,n:76,d:2},{s:4,n:77,d:1},{s:5,n:79,d:1},{s:6,n:79,d:2},{s:8,n:77,d:2},{s:10,n:76,d:2},{s:12,n:74,d:4},
    {s:16,n:79,d:2},{s:18,n:77,d:2},{s:20,n:76,d:2},{s:22,n:74,d:2},{s:24,n:72,d:2},{s:26,n:74,d:2},{s:28,n:71,d:4},
    {s:32,n:72,d:2},{s:34,n:76,d:2},{s:36,n:81,d:2},{s:38,n:79,d:1},{s:39,n:77,d:1},{s:40,n:76,d:2},{s:42,n:72,d:2},{s:44,n:69,d:4},
    {s:48,n:72,d:2},{s:50,n:76,d:2},{s:52,n:79,d:2},{s:54,n:77,d:1},{s:55,n:76,d:1},{s:56,n:74,d:2},{s:58,n:71,d:2},{s:60,n:72,d:4}
  ];
  const LEAD2=[
    {s:0,n:84,d:2},{s:2,n:83,d:2},{s:4,n:79,d:2},{s:6,n:76,d:2},{s:8,n:77,d:2},{s:10,n:79,d:2},{s:12,n:84,d:4},
    {s:16,n:83,d:2},{s:18,n:79,d:2},{s:20,n:74,d:2},{s:22,n:79,d:2},{s:24,n:83,d:2},{s:26,n:79,d:1},{s:27,n:77,d:1},{s:28,n:74,d:4},
    {s:32,n:81,d:2},{s:34,n:84,d:2},{s:36,n:88,d:2},{s:38,n:84,d:1},{s:39,n:81,d:1},{s:40,n:79,d:2},{s:42,n:76,d:2},{s:44,n:72,d:4},
    {s:48,n:79,d:2},{s:50,n:84,d:2},{s:52,n:88,d:2},{s:54,n:84,d:1},{s:55,n:79,d:1},{s:56,n:76,d:2},{s:58,n:74,d:2},{s:60,n:72,d:4}
  ];
  // Lead B – NACHTFAHRT: eigenständig, der Korobeiniki-(Tetris-)Quintsprung als Auftakt-Zelle, danach neu & durchgedreht
  const LEADB1=[
    {s:0,n:74,d:2},{s:2,n:72,d:2},{s:4,n:70,d:1},{s:5,n:69,d:1},{s:6,n:77,d:2},{s:8,n:76,d:2},{s:10,n:74,d:2},{s:12,n:72,d:4},
    {s:16,n:70,d:2},{s:18,n:74,d:2},{s:20,n:77,d:2},{s:22,n:79,d:1},{s:23,n:77,d:1},{s:24,n:74,d:2},{s:26,n:70,d:2},{s:28,n:67,d:4},
    {s:32,n:69,d:2},{s:34,n:72,d:2},{s:36,n:76,d:2},{s:38,n:74,d:1},{s:39,n:72,d:1},{s:40,n:69,d:2},{s:42,n:67,d:2},{s:44,n:64,d:4},
    {s:48,n:70,d:2},{s:50,n:67,d:2},{s:52,n:74,d:2},{s:54,n:72,d:1},{s:55,n:70,d:1},{s:56,n:69,d:2},{s:58,n:67,d:2},{s:60,n:74,d:4}
  ];
  const LEADB2=[
    {s:0,n:81,d:2},{s:2,n:74,d:2},{s:4,n:77,d:1},{s:5,n:79,d:1},{s:6,n:81,d:2},{s:8,n:79,d:2},{s:10,n:77,d:2},{s:12,n:74,d:4},
    {s:16,n:74,d:2},{s:18,n:77,d:2},{s:20,n:82,d:2},{s:22,n:79,d:2},{s:24,n:77,d:2},{s:26,n:74,d:2},{s:28,n:70,d:4},
    {s:32,n:76,d:2},{s:34,n:81,d:2},{s:36,n:84,d:2},{s:38,n:81,d:1},{s:39,n:79,d:1},{s:40,n:76,d:2},{s:42,n:72,d:2},{s:44,n:69,d:4},
    {s:48,n:74,d:2},{s:50,n:79,d:2},{s:52,n:82,d:2},{s:54,n:79,d:1},{s:55,n:77,d:1},{s:56,n:74,d:2},{s:58,n:70,d:2},{s:60,n:62,d:4}
  ];
  // Lead C – ÜBERTAKTET (A-Dur, hoch, hektisch 16tel)
  const LEADC1=[
    {s:0,n:81,d:1},{s:1,n:80,d:1},{s:2,n:78,d:1},{s:3,n:76,d:1},{s:4,n:73,d:2},{s:6,n:76,d:2},{s:8,n:81,d:1},{s:9,n:78,d:1},
    {s:10,n:76,d:1},{s:11,n:73,d:1},{s:12,n:69,d:4},{s:16,n:80,d:1},{s:17,n:76,d:1},{s:18,n:73,d:2},{s:20,n:68,d:2},{s:22,n:71,d:2},
    {s:24,n:76,d:1},{s:25,n:73,d:1},{s:26,n:68,d:2},{s:28,n:64,d:4},{s:32,n:78,d:1},{s:33,n:74,d:1},{s:34,n:69,d:2},{s:36,n:73,d:2},
    {s:38,n:78,d:2},{s:40,n:81,d:1},{s:41,n:78,d:1},{s:42,n:74,d:2},{s:44,n:69,d:4},{s:48,n:74,d:1},{s:49,n:78,d:1},{s:50,n:81,d:2},
    {s:52,n:85,d:2},{s:54,n:81,d:2},{s:56,n:78,d:1},{s:57,n:74,d:1},{s:58,n:69,d:2},{s:60,n:73,d:4}
  ];
  const LEADC2=[
    {s:0,n:85,d:1},{s:1,n:81,d:1},{s:2,n:78,d:2},{s:4,n:76,d:1},{s:5,n:73,d:1},{s:6,n:69,d:2},{s:8,n:73,d:1},{s:9,n:76,d:1},
    {s:10,n:78,d:1},{s:11,n:81,d:1},{s:12,n:85,d:4},{s:16,n:83,d:1},{s:17,n:80,d:1},{s:18,n:76,d:2},{s:20,n:71,d:2},{s:22,n:68,d:2},
    {s:24,n:71,d:1},{s:25,n:76,d:1},{s:26,n:80,d:2},{s:28,n:76,d:4},{s:32,n:81,d:1},{s:33,n:78,d:1},{s:34,n:73,d:2},{s:36,n:69,d:2},
    {s:38,n:73,d:2},{s:40,n:78,d:1},{s:41,n:81,d:1},{s:42,n:85,d:2},{s:44,n:90,d:4},{s:48,n:86,d:1},{s:49,n:81,d:1},{s:50,n:78,d:2},
    {s:52,n:74,d:2},{s:54,n:69,d:2},{s:56,n:73,d:1},{s:57,n:78,d:1},{s:58,n:81,d:2},{s:60,n:69,d:4}
  ];
  // Lead D – STRATOSPHÄRE (G-Dur, hell & hymnisch, treibender Achtel-Bass)
  const LEADD1=[
    {s:0,n:79,d:2},{s:2,n:74,d:2},{s:4,n:71,d:2},{s:6,n:74,d:1},{s:7,n:76,d:1},{s:8,n:79,d:2},{s:10,n:83,d:2},{s:12,n:79,d:4},
    {s:16,n:78,d:2},{s:18,n:74,d:2},{s:20,n:71,d:2},{s:22,n:69,d:2},{s:24,n:74,d:2},{s:26,n:78,d:1},{s:27,n:81,d:1},{s:28,n:74,d:4},
    {s:32,n:76,d:2},{s:34,n:79,d:2},{s:36,n:83,d:2},{s:38,n:79,d:1},{s:39,n:76,d:1},{s:40,n:74,d:2},{s:42,n:71,d:2},{s:44,n:67,d:4},
    {s:48,n:72,d:2},{s:50,n:76,d:2},{s:52,n:79,d:2},{s:54,n:76,d:1},{s:55,n:72,d:1},{s:56,n:74,d:2},{s:58,n:79,d:2},{s:60,n:79,d:4}
  ];
  const LEADD2=[
    {s:0,n:86,d:2},{s:2,n:83,d:2},{s:4,n:79,d:2},{s:6,n:74,d:2},{s:8,n:79,d:1},{s:9,n:83,d:1},{s:10,n:86,d:2},{s:12,n:91,d:4},
    {s:16,n:90,d:2},{s:18,n:86,d:2},{s:20,n:81,d:2},{s:22,n:78,d:2},{s:24,n:81,d:2},{s:26,n:86,d:1},{s:27,n:90,d:1},{s:28,n:81,d:4},
    {s:32,n:83,d:2},{s:34,n:79,d:2},{s:36,n:76,d:2},{s:38,n:71,d:2},{s:40,n:76,d:1},{s:41,n:79,d:1},{s:42,n:83,d:2},{s:44,n:88,d:4},
    {s:48,n:84,d:2},{s:50,n:79,d:2},{s:52,n:76,d:2},{s:54,n:72,d:2},{s:56,n:79,d:2},{s:58,n:83,d:1},{s:59,n:86,d:1},{s:60,n:79,d:4}
  ];
  // Lead E – ARKADE (A-Moll, eingängiger Chiptune-Ohrwurm, treibend)
  const LEADE1=[
    {s:0,n:81,d:2},{s:2,n:84,d:2},{s:4,n:83,d:1},{s:5,n:81,d:1},{s:6,n:79,d:1},{s:7,n:77,d:1},{s:8,n:76,d:2},{s:10,n:72,d:2},{s:12,n:69,d:4},
    {s:16,n:79,d:2},{s:18,n:83,d:2},{s:20,n:86,d:2},{s:22,n:83,d:1},{s:23,n:79,d:1},{s:24,n:77,d:2},{s:26,n:74,d:2},{s:28,n:71,d:4},
    {s:32,n:77,d:2},{s:34,n:81,d:2},{s:36,n:84,d:2},{s:38,n:81,d:1},{s:39,n:77,d:1},{s:40,n:76,d:2},{s:42,n:72,d:2},{s:44,n:69,d:4},
    {s:48,n:74,d:2},{s:50,n:79,d:2},{s:52,n:83,d:2},{s:54,n:79,d:1},{s:55,n:76,d:1},{s:56,n:74,d:2},{s:58,n:71,d:2},{s:60,n:67,d:4}
  ];
  const LEADE2=[
    {s:0,n:84,d:2},{s:2,n:81,d:2},{s:4,n:76,d:2},{s:6,n:72,d:2},{s:8,n:76,d:1},{s:9,n:81,d:1},{s:10,n:84,d:2},{s:12,n:88,d:4},
    {s:16,n:86,d:2},{s:18,n:83,d:2},{s:20,n:79,d:2},{s:22,n:74,d:2},{s:24,n:79,d:2},{s:26,n:83,d:1},{s:27,n:86,d:1},{s:28,n:79,d:4},
    {s:32,n:84,d:2},{s:34,n:81,d:2},{s:36,n:77,d:2},{s:38,n:72,d:2},{s:40,n:77,d:1},{s:41,n:81,d:1},{s:42,n:84,d:2},{s:44,n:89,d:4},
    {s:48,n:86,d:2},{s:50,n:83,d:2},{s:52,n:79,d:2},{s:54,n:76,d:2},{s:56,n:79,d:2},{s:58,n:76,d:1},{s:59,n:79,d:1},{s:60,n:81,d:4}
  ];
  // Menü-Lead – NEON CHILL (C-Dur, träumerisch, viel Raum, lange Töne)
  const LEADM1=[
    {s:0,n:72,d:6},{s:6,n:76,d:6},{s:12,n:74,d:4},
    {s:16,n:72,d:6},{s:22,n:69,d:6},{s:28,n:71,d:4},
    {s:32,n:69,d:6},{s:38,n:72,d:6},{s:44,n:74,d:4},
    {s:48,n:74,d:4},{s:52,n:71,d:4},{s:56,n:67,d:8}
  ];
  const LEADM2=[
    {s:0,n:79,d:4},{s:4,n:76,d:4},{s:8,n:72,d:4},{s:12,n:74,d:4},
    {s:16,n:76,d:4},{s:20,n:72,d:4},{s:24,n:69,d:4},{s:28,n:67,d:4},
    {s:32,n:72,d:4},{s:36,n:76,d:4},{s:40,n:79,d:6},{s:46,n:77,d:2},
    {s:48,n:76,d:6},{s:54,n:72,d:4},{s:58,n:71,d:6}
  ];
  // ---- 3. Phrasen (B-Teile) je Song → ein Song bleibt länger frisch, bevor er sich wiederholt ----
  const LEAD3=[ // PROLOG (C-Dur), hellerer Gegenteil
    {s:0,n:79,d:2},{s:2,n:81,d:2},{s:4,n:83,d:2},{s:6,n:84,d:2},{s:8,n:83,d:1},{s:9,n:81,d:1},{s:10,n:79,d:2},{s:12,n:76,d:4},
    {s:16,n:77,d:2},{s:18,n:79,d:2},{s:20,n:81,d:2},{s:22,n:79,d:1},{s:23,n:77,d:1},{s:24,n:76,d:2},{s:26,n:72,d:2},{s:28,n:74,d:4},
    {s:32,n:72,d:2},{s:34,n:76,d:2},{s:36,n:79,d:2},{s:38,n:84,d:2},{s:40,n:83,d:1},{s:41,n:79,d:1},{s:42,n:76,d:2},{s:44,n:72,d:4},
    {s:48,n:74,d:2},{s:50,n:77,d:2},{s:52,n:79,d:2},{s:54,n:77,d:1},{s:55,n:74,d:1},{s:56,n:72,d:2},{s:58,n:71,d:2},{s:60,n:72,d:4}
  ];
  const LEADB3=[ // NACHTFAHRT (d-moll)
    {s:0,n:74,d:2},{s:2,n:77,d:2},{s:4,n:79,d:2},{s:6,n:77,d:1},{s:7,n:76,d:1},{s:8,n:74,d:2},{s:10,n:72,d:2},{s:12,n:70,d:4},
    {s:16,n:72,d:2},{s:18,n:74,d:2},{s:20,n:77,d:2},{s:22,n:81,d:2},{s:24,n:79,d:1},{s:25,n:77,d:1},{s:26,n:74,d:2},{s:28,n:72,d:4},
    {s:32,n:69,d:2},{s:34,n:74,d:2},{s:36,n:77,d:2},{s:38,n:79,d:2},{s:40,n:77,d:1},{s:41,n:74,d:1},{s:42,n:72,d:2},{s:44,n:69,d:4},
    {s:48,n:70,d:2},{s:50,n:74,d:2},{s:52,n:77,d:2},{s:54,n:74,d:1},{s:55,n:72,d:1},{s:56,n:70,d:2},{s:58,n:69,d:2},{s:60,n:74,d:4}
  ];
  const LEADC3=[ // ÜBERTAKTET (A-Dur, hektisch)
    {s:0,n:81,d:1},{s:1,n:78,d:1},{s:2,n:76,d:2},{s:4,n:73,d:1},{s:5,n:76,d:1},{s:6,n:81,d:2},{s:8,n:85,d:1},{s:9,n:81,d:1},{s:10,n:78,d:2},{s:12,n:76,d:4},
    {s:16,n:78,d:1},{s:17,n:81,d:1},{s:18,n:85,d:2},{s:20,n:88,d:2},{s:22,n:85,d:1},{s:23,n:81,d:1},{s:24,n:78,d:2},{s:26,n:73,d:2},{s:28,n:76,d:4},
    {s:32,n:73,d:1},{s:33,n:76,d:1},{s:34,n:78,d:2},{s:36,n:81,d:1},{s:37,n:85,d:1},{s:38,n:88,d:2},{s:40,n:85,d:1},{s:41,n:81,d:1},{s:42,n:78,d:2},{s:44,n:76,d:4},
    {s:48,n:80,d:1},{s:49,n:78,d:1},{s:50,n:76,d:2},{s:52,n:73,d:2},{s:54,n:69,d:2},{s:56,n:73,d:1},{s:57,n:76,d:1},{s:58,n:81,d:2},{s:60,n:81,d:4}
  ];
  const LEADD3=[ // STRATOSPHÄRE (G-Dur, hell)
    {s:0,n:79,d:2},{s:2,n:83,d:2},{s:4,n:86,d:2},{s:6,n:83,d:1},{s:7,n:81,d:1},{s:8,n:79,d:2},{s:10,n:76,d:2},{s:12,n:74,d:4},
    {s:16,n:76,d:2},{s:18,n:79,d:2},{s:20,n:83,d:2},{s:22,n:81,d:1},{s:23,n:79,d:1},{s:24,n:78,d:2},{s:26,n:74,d:2},{s:28,n:71,d:4},
    {s:32,n:74,d:2},{s:34,n:78,d:2},{s:36,n:81,d:2},{s:38,n:86,d:2},{s:40,n:83,d:1},{s:41,n:79,d:1},{s:42,n:76,d:2},{s:44,n:74,d:4},
    {s:48,n:71,d:2},{s:50,n:74,d:2},{s:52,n:79,d:2},{s:54,n:76,d:1},{s:55,n:74,d:1},{s:56,n:72,d:2},{s:58,n:74,d:2},{s:60,n:79,d:4}
  ];
  const LEADE3=[ // ARKADE (a-moll, eingängig)
    {s:0,n:81,d:2},{s:2,n:79,d:1},{s:3,n:77,d:1},{s:4,n:76,d:2},{s:6,n:74,d:2},{s:8,n:72,d:1},{s:9,n:74,d:1},{s:10,n:76,d:2},{s:12,n:69,d:4},
    {s:16,n:76,d:2},{s:18,n:77,d:1},{s:19,n:79,d:1},{s:20,n:81,d:2},{s:22,n:84,d:2},{s:24,n:83,d:1},{s:25,n:81,d:1},{s:26,n:79,d:2},{s:28,n:76,d:4},
    {s:32,n:74,d:2},{s:34,n:77,d:2},{s:36,n:81,d:2},{s:38,n:79,d:1},{s:39,n:77,d:1},{s:40,n:76,d:2},{s:42,n:72,d:2},{s:44,n:69,d:4},
    {s:48,n:72,d:2},{s:50,n:76,d:2},{s:52,n:79,d:2},{s:54,n:81,d:2},{s:56,n:79,d:1},{s:57,n:76,d:1},{s:58,n:74,d:2},{s:60,n:69,d:4}
  ];
  // Lead F – TIEFENRAUSCH (d-moll, dunkel/dubby, Half-Time): tiefe, langsame Melodie mit viel Raum
  const LEADF1=[
    {s:0,n:62,d:4},{s:4,n:65,d:2},{s:6,n:69,d:2},{s:8,n:67,d:2},{s:10,n:65,d:2},{s:12,n:62,d:4},
    {s:16,n:60,d:4},{s:20,n:65,d:2},{s:22,n:69,d:2},{s:24,n:70,d:2},{s:26,n:69,d:2},{s:28,n:65,d:4},
    {s:32,n:62,d:2},{s:34,n:69,d:2},{s:36,n:74,d:2},{s:38,n:72,d:2},{s:40,n:70,d:2},{s:42,n:69,d:2},{s:44,n:65,d:4},
    {s:48,n:67,d:2},{s:50,n:65,d:2},{s:52,n:62,d:2},{s:54,n:60,d:2},{s:56,n:62,d:4},{s:60,n:57,d:4}
  ];
  const LEADF2=[
    {s:0,n:74,d:2},{s:2,n:77,d:2},{s:4,n:81,d:2},{s:6,n:77,d:2},{s:8,n:74,d:2},{s:10,n:72,d:2},{s:12,n:70,d:4},
    {s:16,n:72,d:2},{s:18,n:74,d:2},{s:20,n:77,d:2},{s:22,n:81,d:2},{s:24,n:82,d:2},{s:26,n:81,d:1},{s:27,n:77,d:1},{s:28,n:74,d:4},
    {s:32,n:70,d:2},{s:34,n:74,d:2},{s:36,n:77,d:2},{s:38,n:81,d:2},{s:40,n:77,d:1},{s:41,n:74,d:1},{s:42,n:72,d:2},{s:44,n:69,d:4},
    {s:48,n:70,d:2},{s:50,n:74,d:2},{s:52,n:77,d:2},{s:54,n:74,d:1},{s:55,n:70,d:1},{s:56,n:69,d:2},{s:58,n:67,d:2},{s:60,n:62,d:4}
  ];
  const LEADF3=[
    {s:0,n:69,d:2},{s:2,n:72,d:2},{s:4,n:74,d:2},{s:6,n:77,d:2},{s:8,n:74,d:1},{s:9,n:72,d:1},{s:10,n:70,d:2},{s:12,n:69,d:4},
    {s:16,n:65,d:2},{s:18,n:69,d:2},{s:20,n:74,d:2},{s:22,n:72,d:2},{s:24,n:70,d:2},{s:26,n:69,d:2},{s:28,n:67,d:4},
    {s:32,n:74,d:2},{s:34,n:77,d:2},{s:36,n:81,d:2},{s:38,n:79,d:1},{s:39,n:77,d:1},{s:40,n:74,d:2},{s:42,n:70,d:2},{s:44,n:69,d:4},
    {s:48,n:72,d:2},{s:50,n:70,d:2},{s:52,n:74,d:2},{s:54,n:72,d:1},{s:55,n:69,d:1},{s:56,n:67,d:2},{s:58,n:65,d:2},{s:60,n:62,d:4}
  ];
  // Lead G – HYPERLOOP (e-moll, schnell/energetisch, Breakbeat): treibende 16tel-Hooks
  const LEADG1=[
    {s:0,n:76,d:2},{s:2,n:79,d:2},{s:4,n:83,d:1},{s:5,n:81,d:1},{s:6,n:79,d:2},{s:8,n:76,d:2},{s:10,n:74,d:2},{s:12,n:71,d:4},
    {s:16,n:74,d:2},{s:18,n:76,d:2},{s:20,n:79,d:2},{s:22,n:83,d:1},{s:23,n:81,d:1},{s:24,n:79,d:2},{s:26,n:76,d:2},{s:28,n:72,d:4},
    {s:32,n:71,d:2},{s:34,n:74,d:2},{s:36,n:79,d:2},{s:38,n:83,d:2},{s:40,n:81,d:1},{s:41,n:79,d:1},{s:42,n:76,d:2},{s:44,n:71,d:4},
    {s:48,n:72,d:2},{s:50,n:76,d:2},{s:52,n:79,d:2},{s:54,n:76,d:1},{s:55,n:74,d:1},{s:56,n:72,d:2},{s:58,n:71,d:2},{s:60,n:76,d:4}
  ];
  const LEADG2=[
    {s:0,n:83,d:2},{s:2,n:86,d:2},{s:4,n:88,d:2},{s:6,n:86,d:1},{s:7,n:83,d:1},{s:8,n:81,d:2},{s:10,n:79,d:2},{s:12,n:76,d:4},
    {s:16,n:79,d:2},{s:18,n:83,d:2},{s:20,n:86,d:2},{s:22,n:88,d:2},{s:24,n:86,d:1},{s:25,n:83,d:1},{s:26,n:79,d:2},{s:28,n:76,d:4},
    {s:32,n:78,d:2},{s:34,n:81,d:2},{s:36,n:84,d:2},{s:38,n:88,d:2},{s:40,n:86,d:1},{s:41,n:83,d:1},{s:42,n:79,d:2},{s:44,n:76,d:4},
    {s:48,n:79,d:2},{s:50,n:83,d:2},{s:52,n:86,d:2},{s:54,n:83,d:1},{s:55,n:79,d:1},{s:56,n:76,d:2},{s:58,n:74,d:2},{s:60,n:71,d:4}
  ];
  const LEADG3=[
    {s:0,n:79,d:1},{s:1,n:81,d:1},{s:2,n:83,d:2},{s:4,n:81,d:1},{s:5,n:79,d:1},{s:6,n:76,d:2},{s:8,n:74,d:1},{s:9,n:76,d:1},{s:10,n:79,d:2},{s:12,n:71,d:4},
    {s:16,n:76,d:2},{s:18,n:79,d:2},{s:20,n:81,d:2},{s:22,n:83,d:2},{s:24,n:84,d:1},{s:25,n:83,d:1},{s:26,n:81,d:2},{s:28,n:79,d:4},
    {s:32,n:76,d:2},{s:34,n:79,d:2},{s:36,n:83,d:2},{s:38,n:81,d:1},{s:39,n:79,d:1},{s:40,n:76,d:2},{s:42,n:74,d:2},{s:44,n:71,d:4},
    {s:48,n:74,d:2},{s:50,n:79,d:2},{s:52,n:83,d:2},{s:54,n:81,d:1},{s:55,n:76,d:1},{s:56,n:74,d:2},{s:58,n:72,d:2},{s:60,n:76,d:4}
  ];
  // ---- Groove-Identität pro Song: eigenes Schlagzeug-Pattern (Kick/Snare/Hat-Steps, Ghost-Snares, Swing) → jeder Song fühlt sich anders an ----
  const GROOVES={
    four:    {kick:[0,4,8,12], snare:[4,12], hat:2, ghost:[]},          // klassischer Four-on-the-floor
    driving: {kick:[0,8],      snare:[4,12], hat:2, ghost:[]},          // treibender Backbeat (bisheriges Standard-Gefühl)
    half:    {kick:[0,10],     snare:[8],    hat:4, ghost:[]},          // Half-Time: spärlich, viel Raum, dubby
    break:   {kick:[0,3,10],   snare:[4,12], hat:2, ghost:[7,14]},      // Breakbeat: synkopiert + Ghost-Snares
    electro: {kick:[0,6,10],   snare:[4,12], hat:2, ghost:[]},          // Electro-Funk: verschobene Kicks
    shuffle: {kick:[0,8],      snare:[4,12], hat:2, ghost:[], swing:0.2} // Shuffle: geswingte Offbeats
  };
  // Songs: leads[] = 3 Phrasen (rotieren über Loops). groove/bassPat/staccato/leadEcho/leadOct = eigener Klang-Charakter.
  const SONGS=[
    {name:'PROLOG',      leads:[LEAD1, LEAD2, LEAD3],   bass:[36,43,45,36], chords:[[60,64,67],[55,59,62],[57,60,64],[60,64,67]], lt:'p50', leadVol:0.17, groove:'four',    bassPat:'quarter', staccato:0.96, leadEcho:0.32},
    {name:'NACHTFAHRT',  leads:[LEADB1,LEADB2,LEADB3],  bass:[38,43,45,43], chords:[[62,65,69],[58,62,67],[57,60,64],[58,62,67]], lt:'p25', leadVol:0.13, groove:'driving', bassPat:'octave',  staccato:0.90, leadEcho:0.44, hatEvery:4},
    {name:'ÜBERTAKTET',  leads:[LEADC1,LEADC2,LEADC3],  bass:[45,40,42,38], chords:[[57,61,64],[52,56,59],[54,57,61],[50,54,57]], lt:'p12', leadVol:0.15, groove:'break',   bassPat:'offbeat', staccato:0.62, leadEcho:0.20, hatEvery:1},
    {name:'STRATOSPHÄRE',leads:[LEADD1,LEADD2,LEADD3],  bass:[43,38,40,36], chords:[[55,59,62],[50,54,57],[52,55,59],[48,52,55]], lt:'p25', leadVol:0.13, groove:'electro', bassPat:'eighth',  staccato:0.95, leadEcho:0.36},
    {name:'ARKADE',      leads:[LEADE1,LEADE2,LEADE3],  bass:[45,43,41,43], chords:[[57,60,64],[55,59,62],[53,57,60],[55,59,62]], lt:'p25', leadVol:0.15, groove:'shuffle', bassPat:'walk',    staccato:0.80, leadEcho:0.30},
    {name:'TIEFENRAUSCH',leads:[LEADF1,LEADF2,LEADF3],  bass:[38,34,41,36], chords:[[62,65,69],[58,62,65],[57,60,64],[60,64,67]], lt:'p25', leadVol:0.13, groove:'half',    bassPat:'octave',  staccato:0.92, leadEcho:0.46, leadOct:-12, hatEvery:4},
    {name:'HYPERLOOP',   leads:[LEADG1,LEADG2,LEADG3],  bass:[40,36,43,38], chords:[[64,67,71],[60,64,67],[55,59,62],[62,66,69]], lt:'p12', leadVol:0.15, groove:'break',   bassPat:'eighth',  staccato:0.68, leadEcho:0.24, hatEvery:1}
  ];
  // Eigener, entspannter Menü-Track (rotiert NICHT mit den Level-Songs)
  const MENU_SONG={name:'NEON CHILL', leads:[LEADM1,LEADM2], bass:[36,45,41,43],
    chords:[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,65]], lt:'triangle', leadVol:0.135, chill:true};
  let curSong=0, pendingSong=-1;   // pendingSong: gewählter Folge-Song, wird erst an einer ruhigen Stelle (Intro/Verse) eingeblendet → schleichend
  // ---- Game-Boy-Pulswellen (Tastverhältnis) ----
  // Der GB/NES-Soundchip hat keine echte Säge, sondern Pulskanäle mit 12,5%/25%/50% Duty –
  // genau dieser dünne, nasale Ton macht den „Game-Boy"-Charakter. Wir bauen ihn per Fourierreihe.
  const PULSE={};
  function pulseWave(duty){ const k=duty.toFixed(2); if(PULSE[k]) return PULSE[k];
    const N=22, real=new Float32Array(N), imag=new Float32Array(N);
    for(let n=1;n<N;n++) real[n]=(2/(n*Math.PI))*Math.sin(n*Math.PI*duty);   // Amplitudenspektrum eines Duty-Pulses
    const w=actx.createPeriodicWave(real,imag); PULSE[k]=w; return w; }
  // type 'p12'/'p25'/'p50' → Pulswelle mit 12/25/50% Duty, sonst Standard-Wellenform
  function setOsc(o,type){ if(type&&type[0]==='p') o.setPeriodicWave(pulseWave((+type.slice(1))/100)); else o.type=type; }
  // Songform (gilt für alle Level-Songs): Intro baut auf · Verse atmet · Chorus episch · Bridge = Quarte hoch
  // Songform mit Dramaturgie: Strophe (Melodie vorn) → Steigerung → Drop (Dubstep-Wucht) → Chorus → Bridge → Steigerung → Drop
  const FORM=[{p:1,m:'intro'},{p:1,m:'verse'},{p:2,m:'verse'},{p:2,m:'build'},
              {p:1,m:'drop'},{p:1,m:'chorus'},{p:2,m:'bridge'},{p:2,m:'build'},{p:1,m:'drop'},{p:2,m:'chorus'}];
  function mVoice(time,freq,dur,type,vol,atk=0.005){
    const o=actx.createOscillator(), g=actx.createGain();
    setOsc(o,type); o.frequency.setValueAtTime(freq,time);
    g.gain.setValueAtTime(0.0001,time); g.gain.linearRampToValueAtTime(vol,time+atk);
    g.gain.exponentialRampToValueAtTime(0.0001,time+dur);
    o.connect(g); g.connect(musicGain); o.start(time); o.stop(time+dur+0.02);
  }
  // Fette Lead-Stimme: 2 leicht verstimmte Oszis (Chorus) + Sub-Oktave + Tiefpass-Sweep + Vibrato + Echo-Send
  function mLead(time,freq,dur,type,vol,echo){
    const g=actx.createGain();
    g.gain.setValueAtTime(0.0001,time); g.gain.linearRampToValueAtTime(vol,time+0.014);
    g.gain.exponentialRampToValueAtTime(0.0001,time+dur);
    const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=0.9;
    lp.frequency.setValueAtTime(Math.min(9000,freq*5),time);
    lp.frequency.linearRampToValueAtTime(Math.min(5200,freq*2.6),time+dur);
    lp.connect(g); g.connect(musicGain);
    if(echo&&musicDelay){ const s=actx.createGain(); s.gain.value=echo; g.connect(s); s.connect(musicDelay); }
    for(const c of [-6,6]){ const o=actx.createOscillator(); setOsc(o,type); o.frequency.setValueAtTime(freq,time); o.detune.setValueAtTime(c,time);
      if(vibGain) vibGain.connect(o.detune); o.connect(lp); o.start(time); o.stop(time+dur+0.03); }
    const sub=actx.createOscillator(); sub.type='triangle'; sub.frequency.setValueAtTime(freq/2,time);
    const sg=actx.createGain(); sg.gain.value=0.32; sub.connect(sg); sg.connect(lp); sub.start(time); sub.stop(time+dur+0.03);
  }
  // PERF: EIN gemeinsamer Weißrausch-Puffer (2 s), wird über alle Snares/Hats/Riser wiederverwendet.
  // Vorher: jeder mNoise-Aufruf legte einen neuen AudioBuffer an und füllte tausende Random-Samples
  // (mehrfach pro Takt) → massive GC-Last + Main-Thread-Stottern. Jetzt nur noch ein billiger BufferSource.
  let _noiseBuf=null;
  function noiseBuf(){ if(_noiseBuf) return _noiseBuf;
    const len=actx.sampleRate*2, b=actx.createBuffer(1,len,actx.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=Math.random()*2-1; _noiseBuf=b; return b; }
  function mNoise(time,dur,vol,hp){
    const src=actx.createBufferSource(); src.buffer=noiseBuf(); src.loop=true;
    const f=actx.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp||4000;
    const g=actx.createGain(); g.gain.setValueAtTime(vol,time); g.gain.exponentialRampToValueAtTime(0.001,time+dur);
    src.connect(f); f.connect(g); g.connect(musicGain);
    src.start(time, Math.random()*1.8); src.stop(time+dur);   // zufälliger Startoffset = Variation ohne neuen Puffer
  }
  function mKick(time){
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='sine'; o.frequency.setValueAtTime(150,time); o.frequency.exponentialRampToValueAtTime(45,time+0.12);
    g.gain.setValueAtTime(0.55,time); g.gain.exponentialRampToValueAtTime(0.001,time+0.16);
    o.connect(g); g.connect(musicGain); o.start(time); o.stop(time+0.18);
  }
  // Prise Dubstep: Half-Time-Wobble-Sub (Säge+Sub durch resonanten Tiefpass, LFO moduliert die Cutoff = „Wob").
  // Bewusst die einzige Säge (= EDM-Schicht, kontrastiert den Chip-Lead) und nur auf der Chorus-Eins.
  function mWobble(time,freq,dur){
    const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=12; lp.frequency.setValueAtTime(480,time);
    const lfo=actx.createOscillator(); lfo.type='sine'; lfo.frequency.setValueAtTime(1/(secPerStep*2),time);   // achtelsynchroner Wobble
    const lg=actx.createGain(); lg.gain.value=900; lfo.connect(lg); lg.connect(lp.frequency);                  // tiefe Cutoff-Modulation = fetter Grind
    const g=actx.createGain(); g.gain.setValueAtTime(0.0001,time); g.gain.linearRampToValueAtTime(0.12,time+0.02);
    g.gain.setValueAtTime(0.12,time+dur*0.8); g.gain.exponentialRampToValueAtTime(0.0001,time+dur);
    const sub=actx.createOscillator(); sub.type='sine'; sub.frequency.setValueAtTime(freq/2,time); sub.connect(lp);
    const oscs=[sub];
    for(const det of [-9,9]){ const o=actx.createOscillator(); o.type='sawtooth'; o.frequency.setValueAtTime(freq,time); o.detune.setValueAtTime(det,time); o.connect(lp); oscs.push(o); } // 2 verstimmte Sägen = breit/grindig
    lp.connect(g); g.connect(musicGain);
    const end=time+dur+0.02; lfo.start(time); lfo.stop(end); for(const o of oscs){ o.start(time); o.stop(end); }
  }
  // Arcade-Laser „Pew": Puls mit schnellem Frequenz-Sweep (up=aufsteigend) → 80er-Spielhallen-Zap
  function mLaser(time,freq,dur,up,vol){
    const o=actx.createOscillator(); setOsc(o,'p25'); o.frequency.setValueAtTime(freq,time);
    o.frequency.exponentialRampToValueAtTime(Math.max(60, up?freq*2.8:freq/3.2), time+dur);
    const g=actx.createGain(); g.gain.setValueAtTime(0.0001,time); g.gain.linearRampToValueAtTime(vol||0.07,time+0.004); g.gain.exponentialRampToValueAtTime(0.0001,time+dur);
    o.connect(g); g.connect(musicGain);
    if(musicDelay){ const s=actx.createGain(); s.gain.value=0.35; g.connect(s); s.connect(musicDelay); }
    o.start(time); o.stop(time+dur+0.02);
  }
  // Heller, kurzer Arpeggio-/Twinkle-Ton mit Echo – Basis der prozeduralen Variation
  function mArp(time,freq,dur,vol){
    const o=actx.createOscillator(), g=actx.createGain();
    o.type='triangle'; o.frequency.setValueAtTime(freq,time);
    g.gain.setValueAtTime(0.0001,time); g.gain.linearRampToValueAtTime(vol,time+0.004);
    g.gain.exponentialRampToValueAtTime(0.0001,time+dur);
    o.connect(g); g.connect(musicGain);
    if(musicDelay){ const s=actx.createGain(); s.gain.value=0.4; g.connect(s); s.connect(musicDelay); }
    o.start(time); o.stop(time+dur+0.02);
  }
  function sfxRiser(){ if(!actx||!opt.sfx) return; try{
    const o=actx.createOscillator(), g=actx.createGain(); o.type='sawtooth';
    o.frequency.setValueAtTime(180,actx.currentTime); o.frequency.exponentialRampToValueAtTime(1900,actx.currentTime+0.7);
    g.gain.setValueAtTime(0.0001,actx.currentTime); g.gain.linearRampToValueAtTime(0.22,actx.currentTime+0.55); g.gain.exponentialRampToValueAtTime(0.0001,actx.currentTime+0.82);
    o.connect(g); g.connect(sfxGain); o.start(); o.stop(actx.currentTime+0.85);
  }catch(e){} }
  function scheduleStep(step,time){
    const playing=(state!==S.MENU);
    musicShift=playing?levelKey(level||1):0;                                  // Tonart steigt pro Level
    secPerStep=60/((BPM+(playing?Math.min(((level||1)-1)*2,20):0))*4);        // Tempo zieht pro Level nur sanft an (bis +20 BPM) – nicht mehr zu krass
    const song=(state===S.MENU)?MENU_SONG:(SONGS[curSong]||SONGS[0]);
    const lv=song.leadVol||0.16, echo=song.chill?0.5:0.3;
    const block=Math.floor(step/16), ls=step%16;
    // ---- SONGFORM: echtes Arrangement statt 2-Phrasen-Loop (Intro→Verse→Chorus→Bridge→Chorus über 8 Loops) ----
    const sec=song.chill?{p:(loopCount%2)+1,m:'chill'}:FORM[loopCount%FORM.length];
    const leads=song.leads||[song.lead1,song.lead2];
    let pi=(sec.p-1)%leads.length;                                            // p=1→Phrase A, p=2→Phrase B
    if(leads.length>1) pi=(pi+Math.floor(loopCount/FORM.length))%leads.length; // weitere Phrasen rotieren über die Loops rein → länger frisch
    const lead=leads[pi]||leads[0];
    const m=sec.m;
    const intro=m==='intro', verse=m==='verse', build=m==='build', drop=m==='drop', chorus=m==='chorus', bridge=m==='bridge';
    const big=drop||chorus;                           // volle Energie (Drop/Chorus)
    const kt=bridge?5:0;                              // Bridge: Melodie + Harmonie eine Quarte hoch = klar neues Songteil
    const root=song.bass[block]+kt;
    // ---- LEAD = Hauptmelodie klar VORN. Verse am lautesten; im Build läuft sie sanft aus (kein harter Schnitt → fließt) ----
    const lo=song.leadOct||0, stac=song.staccato||0.94, lecho=(song.leadEcho!=null?song.leadEcho:echo);   // Artikulation/Hall pro Song = eigener Lead-Charakter
    if(!build || step<32){ const lvol=build?lv*0.7*(1-step/32):(verse?lv*1.32:(big?lv*1.14:(intro?lv*0.82:lv)));
      for(const e of lead) if(e.s===step){ mLead(time,midiF(e.n+kt+lo),e.d*secPerStep*stac,song.lt,lvol,lecho);
        if(big && e.d>=2) mVoice(time,midiF(e.n+kt+lo+12),e.d*secPerStep*0.6,'p50',lv*0.3,0.012); } }   // Drop/Chorus: Oktav-Harmonie drauf
    if(song.chill){
      if(ls===0||ls===8) mVoice(time,midiF(root),secPerStep*5,'triangle',0.20,0.012);                 // weicher, ruhiger Bass
      if(ls===0){ for(const cn of song.chords[block]) mVoice(time,midiF(cn+12),secPerStep*15,'sine',0.03,0.06); } // sanfter Pad-Akkord
      if(ls===0||ls===8) mKick(time);                                                                  // entspannter Puls
      if(ls%4===2) mNoise(time,0.02,0.018,9000);                                                       // dezenter Shaker
      if((ls===6||ls===14) && loopCount%2===0){ const c=song.chords[block]; mArp(time,midiF(c[(ls/2)%c.length]+24),secPerStep*1.6,0.022); } // träumerische Sparkle
      return;
    }
    // ===== STEIGERUNG (Build): keine Melodie, Snare-Roll verdichtet sich + Riser steigt → Spannung vor dem Drop =====
    if(build){
      if(ls%4===0) mKick(time);                                                                        // treibender Four-on-the-floor
      const roll=step<32?8:step<48?4:step<56?2:1;                                                       // 8tel → 16tel → 32tel: immer dichter
      if(ls%roll===0) mNoise(time,0.05,0.05+0.16*(step/64),1700);                                       // Snare-Roll, lauter zum Ende
      mNoise(time,0.045,0.015+0.10*(step/64),900+step*60);                                              // Riser-Sweep (steigt durchgehend an)
      if(ls%2===0){ mVoice(time,midiF(root),secPerStep*1.4,'triangle',0.22,0.004);                       // durchlaufender Bass = Kontinuität (kein Totalausfall)
        const sc=song.chords[block]; mVoice(time,midiF(sc[(step/2)%sc.length]+12+(step>=48?12:0)),secPerStep*0.4,'p25',0.035,0.002); } // aufsteigender Chip-Riser
      return;
    }
    // ---- BASS: eigene Figur pro Song (bassPat) · Intro immer sparsam ----
    if(intro){ if(ls%4===0) mVoice(time,midiF(root),secPerStep*2,'triangle',0.2,0.004); }
    else{ const bp=song.bassPat||'quarter';
      if(bp==='eighth'){ if(ls%2===0) mVoice(time,midiF(root+((big&&ls%4===2)?12:0)),secPerStep*1.5,'triangle',big?0.30:0.24,0.004); }            // treibender Achtel-Bass
      else if(bp==='octave'){ if(ls%4===0) mVoice(time,midiF(root),secPerStep*1.4,'triangle',big?0.32:0.26,0.004); else if(ls%4===2) mVoice(time,midiF(root+12),secPerStep*1.2,'triangle',big?0.22:0.16,0.004); } // NES-Oktav-Bounce
      else if(bp==='offbeat'){ if(ls%4===0) mVoice(time,midiF(root),secPerStep*1.2,'triangle',big?0.30:0.24,0.004); if(ls%4===2) mVoice(time,midiF(root+12),secPerStep*0.8,'triangle',0.18,0.004); } // Eins + Offbeat-Stups
      else if(bp==='walk'){ const wk=[root,root+7,root+12,root+7]; if(ls%2===0) mVoice(time,midiF(wk[(ls/2)%4]),secPerStep*1.3,'triangle',big?0.28:0.22,0.004); } // laufender Bass durch die Akkordtöne
      else { if(ls%4===0) mVoice(time,midiF(root),secPerStep*2,'triangle',big?0.33:0.27,0.004); else if(ls%4===2) mVoice(time,midiF(root+7),secPerStep*1.4,'triangle',0.15); } // quarter
    }
    // ---- DROP = Impact mit Wucht: Crash + Powerchord + EIN kurzer Wob + aufsteigende Arcade-Laser-Fanfare (weniger wawa!) ----
    if(drop && ls===0){ mNoise(time,0.32,0.11,2400); mWobble(time,midiF(root-12),secPerStep*5);             // dezenter Crash + EIN Wob
      for(let z=0;z<4;z++) mLaser(time+z*secPerStep*0.5,midiF(root+12+[0,4,7,12][z]),secPerStep*0.55,true,0.04); } // Laser-Fanfare hoch (dezenter)
    if(drop && ls===8) mLaser(time,midiF(root+24),secPerStep*1.3,false,0.05);                               // Abwärts-Laser-Zap statt 2. Wobble
    if(chorus && ls===0){ mNoise(time,0.22,0.085,3000); for(let z=0;z<3;z++) mLaser(time+z*secPerStep*0.4,midiF(root+19+z*5),secPerStep*0.42,true,0.035); } // Chorus: leise Laser-Fanfare statt Wobble
    if(big && (ls===6||ls===14)) mLaser(time,midiF(root+24+(ls===14?5:0)),secPerStep*0.9,false,0.03);        // dezente Laser-Akzente zwischendurch
    // ---- EPISCHE Power-Akkorde im Drop & Chorus ----
    if(big && (ls===0||ls===8)){ for(const n of [root,root+12,root+19,root+24]) mVoice(time,midiF(n),secPerStep*3.6,'p50',drop?0.085:0.07,0.012); }
    // ---- Chiptune-Arpeggio: im Drop/Chorus breit & laut + Trill-Wahnsinn, im Verse dezent (Melodie bleibt vorn), Intro aus ----
    if(!intro){ const ch=song.chords[block]; mVoice(time,midiF(ch[step%ch.length]+12+kt),secPerStep*0.42,'p12',big?0.075:0.038,0.001);
      if(big && ls%2===0) mVoice(time,midiF(ch[(step+2)%ch.length]+24+kt),secPerStep*0.3,'p12',0.05,0.001);      // 2. Oktave = breiter Chip-Sound
      if(big && ls%4===2){ for(const cn of ch) mVoice(time,midiF(cn+12+kt),secPerStep*0.5,'p25',0.03,0.002); }   // punchy Chip-Stab auf dem Backbeat
      if(big && (ls===14||ls===15)){ mVoice(time,midiF(ch[(step%2?0:2)%ch.length]+24+kt),secPerStep*0.22,'p12',0.05,0.001); } } // 16tel-Trill am Taktende = durchgedreht
    // ---- DRUMS: Groove-Pattern des Songs (Intro = nur Eins · Drop/Chorus treibt voll · Half-Time behält Charakter) ----
    const gv=GROOVES[song.groove]||GROOVES.four;
    const sw=(gv.swing&&ls%4===2)?gv.swing*secPerStep:0;                                                 // Shuffle: Offbeats leicht verzögert
    const kicks=intro?[0]:(big&&song.groove!=='half')?[0,4,8,12]:gv.kick;                                // Drop/Chorus = Four-on-the-floor (außer Half-Time)
    if(kicks.indexOf(ls)>=0) mKick(time+sw);
    if(!intro){ for(const sn of gv.snare) if(sn===ls) mNoise(time+sw,0.12,big?0.20:0.13,1800); }          // Snare
    if(!intro && big){ for(const gh of gv.ghost) if(gh===ls) mNoise(time+sw,0.06,0.07,2600); }            // Ghost-Snares geben dem Breakbeat Drive
    if(state===S.PLAY && !intro && ls%((song.hatEvery||gv.hat)*(big?1:2))===0) mNoise(time+sw,0.025,big?0.06:0.04,8000); // Hats (geswingt)
    // ---- Sparkle-Arp-Schicht NUR in Drop/Chorus (Verse/Bridge bleiben für die Melodie frei) ----
    if(state===S.PLAY && big){ const ch=song.chords[block], V=loopCount;
      const dens=[2,2,4,2][V%4];
      if(ls%dens===0){ const pat=V%3, k=Math.floor(step/dens), seq=ch.length;
        const idx=pat===0?k%seq:pat===1?(seq-1-(k%seq)):[0,1,2,1][k%4]%seq;
        mArp(time,midiF(ch[idx]+12+kt+(V%4===1?12:0)),secPerStep*0.62,0.045); }
      if(step>=58){ const run=[0,2,1,3]; mArp(time,midiF(ch[run[(step-58)%4]%ch.length]+24+kt),secPerStep*0.42,0.05); }
    }
  }
  function scheduler(){
    if(!actx) return;
    if(nextStepTime < actx.currentTime) nextStepTime = actx.currentTime + 0.05; // Resync nach Tab-Wechsel
    while(nextStepTime < actx.currentTime+0.1){
      scheduleStep(step16,nextStepTime);
      nextStepTime+=secPerStep; step16++;
      if(step16>=64){ step16=0; loopCount++;
        // Schleichender Song-Wechsel: vorgemerkten Song nur einblenden, wenn der nächste Loop eine ruhige Sektion ist
        if(pendingSong>=0){ const nm=FORM[loopCount%FORM.length].m; if(nm==='intro'||nm==='verse'||nm==='bridge'){ curSong=pendingSong; pendingSong=-1; } } // mehr Wechsel-Fenster → weniger eintönig, trotzdem an ruhiger Stelle
      }
    }
  }
  function startMusic(){ if(!actx||musicOn) return; musicOn=true; step16=0; loopCount=0; nextStepTime=actx.currentTime+0.08; schedTimer=setInterval(scheduler,25); }

  // ---------- Haptik ----------
  function vibe(p){ const s=(opt&&opt.shake!=null)?opt.shake:1;          // Vibration ist auf Mobil das, was „Screenshake" spürbar macht → an dieselbe Option koppeln
    if(s<=0||!navigator.vibrate) return;                                 // AUS → keine Vibration
    try{ if(s<1) p=Array.isArray(p)?p.map(v=>Math.max(1,Math.round(v*0.5))):Math.max(1,Math.round(p*0.5)); navigator.vibrate(p); }catch(e){} }  // REDUZIERT → halbe Pulse

  // ---------- Resize / Input ----------
  function resize(){ DPR=Math.min(window.devicePixelRatio||1,2);
    const wrap=document.getElementById('wrap');
    // #wrap-Höhe an den WIRKLICH sichtbaren Viewport koppeln (visualViewport) statt nur ans CSS
    // 100dvh: dvh löst auf etlichen Mobil-Engines zum GROSSEN Viewport auf, wenn die Browser-/
    // Systemleiste ein-/ausfährt → die Screens (Menü-Leiste, Overlays, Cockpit) ragen unter den
    // sichtbaren Rand und werden unten ABGESCHNITTEN (und sind dann nicht mal scrollbar). Mit der
    // gemessenen vv.height sitzt #wrap exakt im sichtbaren Bereich. Fallback: CSS 100dvh.
    const vv=window.visualViewport, vh=(vv&&vv.height>0)?Math.round(vv.height):0;
    wrap.style.height=vh?vh+'px':'';
    W=wrap.clientWidth||window.innerWidth; H=wrap.clientHeight||window.innerHeight;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    applyScale();
    ctx.imageSmoothingEnabled=false; placeCockpit(); }   // Pixel-Sprites (Schiff/Boss) nearest-neighbor → scharfe Kanten statt verwaschen
  // Cockpit immer am WIRKLICH sichtbaren unteren Rand verankern. Reines CSS bottom:0 gegen
  // #wrap=100dvh rutscht auf manchen Mobil-Engines unter die ein-/ausfahrende Browser-/System-
  // leiste (100dvh löst dort zum großen Viewport auf) → Cockpit unten angeschnitten. Wir messen
  // die verdeckte Höhe selbstkorrigierend gegen die echte #wrap-Höhe: bei korrektem dvh = 0
  // (also exakt bottom:0), sonst hebt es genau um den verdeckten Betrag an. Safe-Area-Padding
  // (Gesten-/Systemleiste) wirkt zusätzlich obendrauf.
  function placeCockpit(){ const ck=document.getElementById('cockpit'), wrap=document.getElementById('wrap'); if(!ck||!wrap) return;
    const vv=window.visualViewport; let gap=0;
    if(vv){ gap=Math.max(0,Math.round(wrap.clientHeight-(vv.height+vv.offsetTop))); }
    ck.style.bottom=gap+'px'; }
  // Interne Render-Auflösung = W·H · DPR · qScale. qScale<1 (vom Governor unter Last) senkt die Füllrate
  // massiv (Browser skaliert hoch) → flüssiger, ohne dass Spiel-Koordinaten sich ändern (Transform gleicht aus).
  function applyScale(){ const bw=Math.max(1,Math.round(W*DPR*qScale)), bh=Math.max(1,Math.round(H*DPR*qScale));
    if(canvas.width!==bw||canvas.height!==bh){ canvas.width=bw; canvas.height=bh; }
    ctx.setTransform(DPR*qScale,0,0,DPR*qScale,0,0); ctx.imageSmoothingEnabled=false; }
  window.addEventListener('resize',resize);
  // In TWA/PWA-Vollbild blenden sich die System-Leisten erst KURZ nach dem Laden aus →
  // dvh/clientHeight stimmt anfangs noch nicht. Auf weitere Signale hören + mehrfach nachmessen.
  if(window.visualViewport){ window.visualViewport.addEventListener('resize',resize);
    window.visualViewport.addEventListener('scroll',placeCockpit); }   // Toolbar-Ein/Ausblenden feuert oft nur 'scroll' → Cockpit nachführen
  window.addEventListener('orientationchange',()=>{ resize(); setTimeout(resize,250); });
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) resize(); });
  document.addEventListener('fullscreenchange',()=>setTimeout(resize,50));
  document.addEventListener('webkitfullscreenchange',()=>setTimeout(resize,50));
  resize();
  [120,400,900,1600].forEach((d)=>setTimeout(resize,d));   // Vollbild-Übergang abwarten
  function applyFx(){ const w=document.getElementById('wrap'); if(w) w.classList.toggle('crt',!!opt.fx); }   // CRT-Scanlines an/aus (CSS, koppelt an „Effekte")
  applyFx();
  const tgt={x:W/2,y:H*0.72};
  let inputSuppressUntil=0;   // kurzes Fenster nach Karten-Schließen: Steuer-/Sprung-Input ignorieren, damit der Dismiss-Tap das Schiff nicht zur Button-Position zieht
  function setT(x,y){ if(mods&&(mods.invertX||(mods.mirror&&mirrorOn))) x=W-x; tgt.x=x; tgt.y=y; inputDirty=true; }   // Spiegelwelt-Fluch (getaktet) · inputDirty = Eingabe-Signal für Passivitäts-Metrik
  function onMove(e){ if(coachPause||performance.now()<inputSuppressUntil) return; const r=canvas.getBoundingClientRect();
    if(e.touches&&e.touches[0]) setT(e.touches[0].clientX-r.left,e.touches[0].clientY-r.top); else setT(e.clientX-r.left,e.clientY-r.top); }
  canvas.addEventListener('mousemove',onMove);
  canvas.addEventListener('touchstart',e=>{onMove(e);e.preventDefault();},{passive:false});
  canvas.addEventListener('touchmove',e=>{onMove(e);e.preventDefault();},{passive:false});
  // Tap/Klick (kurz, ohne Ziehen) → Sprung-Dash. Läuft unabhängig vom Steuern (Ziehen) über Pointer-Events.
  let tapT=0, tapSX=0, tapSY=0, tapOK=false;
  canvas.addEventListener('pointerdown',e=>{ tapT=performance.now(); tapSX=e.clientX; tapSY=e.clientY; tapOK=true; });
  canvas.addEventListener('pointermove',e=>{ if(tapOK&&(Math.abs(e.clientX-tapSX)>14||Math.abs(e.clientY-tapSY)>14)) tapOK=false; });
  canvas.addEventListener('pointerup',e=>{ if(coachPause){ const r=canvas.getBoundingClientRect(), lx=e.clientX-r.left, ly=e.clientY-r.top;
      if(coachBtn && lx>=coachBtn.x && lx<=coachBtn.x+coachBtn.w && ly>=coachBtn.y && ly<=coachBtn.y+coachBtn.h) resumeCoach();   // nur der WEITER-Button schließt die Tutorial-Karte (kein versehentliches Wegtippen)
      tapOK=false; return; } if(tapOK&&performance.now()-tapT<=300&&state===S.PLAY&&performance.now()>=inputSuppressUntil) tryJump(); tapOK=false; });
  canvas.addEventListener('pointercancel',()=>{ tapOK=false; });
  window.addEventListener('keydown',e=>{ if(coachPause&&(e.code==='Space'||e.code==='Enter')){ resumeCoach(); e.preventDefault(); } });   // Desktop: Leertaste/Enter → weiter

  // Sternenfeld: senkrechtes Parallax (ferne Sterne kriechen, nahe rauschen vorbei) + leichtes Funkeln
  function makeStars(){ stars=[]; for(let i=0;i<95;i++){ const z=Math.random(); stars.push({x:Math.random()*W,y:Math.random()*H,z:z,r:0.6+z*z*2.6,tw:Math.random()*6.28,tws:0.6+Math.random()*1.8}); } }
  function updateStars(dt){ if(!stars) return; for(const s of stars){ s.y+=(10+s.z*s.z*135)*dt; if(s.y>H+2){ s.y=-2; s.x=Math.random()*W; } s.tw+=s.tws*dt; } }
  makeStars();
  const rand=(a,b)=>a+Math.random()*(b-a);
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  // ---------- Seeded RNG (Daily-Runs: deterministische Hindernis-DNA) ----------
  let useSeed=false, seedState=0;
  function mulberry32(){ seedState=(seedState+0x6D2B79F5)|0; let t=seedState;
    t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }
  const grnd=()=> useSeed?mulberry32():Math.random();   // nur für layout-relevante Zufälle
  const grand=(a,b)=>a+grnd()*(b-a);
  const gpick=a=>a[Math.floor(grnd()*a.length)];
  function dailySeed(){ const d=new Date(); return ((d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate())>>>0)||1; }
  function dailyLabel(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
  // ---- Partikel-Pool (Ring-Buffer) ----
  // Statt pro Treffer neue {}-Objekte zu erzeugen und per splice zu loeschen (→ GC-Ruckler bei
  // partikelstarken Waffen), werden PMAX Objekte EINMAL angelegt und danach nur recycelt.
  // emit() ueberschreibt das aelteste Slot → automatischer Cap, keine Allokation, kein splice.
  const PMAX=320; let pHead=0, pAlive=0;
  function initParticlePool(){ particles=[]; for(let i=0;i<PMAX;i++) particles.push({x:0,y:0,vx:0,vy:0,life:0,decay:0,color:'#fff',size:0}); pHead=0; }
  initParticlePool();   // einmalig: Pool fuellen, danach nie wieder neu allokieren
  function emitP(x,y,vx,vy,decay,color,size){ if(fxQ<0.85 && Math.random()>=fxQ) return;   // zentrale Dichte-Bremse: bei Lag einen Teil (1-fxQ) ALLER Partikel weglassen (auch direkte emitP-Aufrufe in Waffen/Effekten)
    const p=particles[pHead]; pHead=(pHead+1)%PMAX;
    p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.life=1;p.decay=decay;p.color=color;p.size=size; }
  function clearParticles(){ for(let i=0;i<particles.length;i++) particles[i].life=0; pHead=0; }
  function spawnParticles(x,y,color,n,spd){ n=Math.max(1,Math.round(n)); for(let i=0;i<n;i++){const a=Math.random()*6.28,s=rand(spd*0.3,spd);   // Dichte-Drosselung zentral in emitP (greift auch für direkte Emitter)
    emitP(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(0.012,0.03),color,rand(2,5));} }
  function floatText(x,y,text,color,size){ floaters.push({x,y,text,color:color||'#fff',size:size||16,life:1,vy:-42}); }
  // Einmal-Hinweis fürs Onboarding (pro Schlüssel nur einmal, in meta gemerkt) – nutzt das Banner-System
  function tutHint(key,text,sub,color){ meta.seen=meta.seen||{}; if(meta.seen[key]) return; meta.seen[key]=1; saveMeta();
    banner={text:text,sub:sub||'',t:3.8,color:color||'#19f0ff'}; flash=Math.min(0.4,(flash||0)+0.12); flashColor=color||'#19f0ff'; }
  // ---------- Onboarding-Coach: erklaert Mechaniken nach und nach, einmal pro Spielerleben (meta.seen) ----------
  const LESSONS={
    move:  {ico:'🕹️', col:'#19f0ff'},
    near:  {ico:'✦',  col:'#ff2e88'},
    combo: {ico:'🔥', col:'#ffe600'},
    coin:  {ico:'🪙', col:'#ffe600'},
    jump:  {ico:'🦘', col:'#19f0ff'},
    sp:    {ico:'💠', col:'#19f0ff'},
    shield:{ico:'🛡️', col:'#2effc0'},
    syn:   {ico:'🔗', col:'#ff2e88'},
    loot:  {ico:'✦',  col:'#ffd23f'},
    wcrate:{ico:'🔫', col:'#caffff'},
    chest: {ico:'📦', col:'#ffd23f'},
  };
  const LESSON_ORDER=['move','near','combo','coin','jump','sp','shield','syn','loot','wcrate','chest'];   // Curriculum-Reihenfolge
  function queueLesson(sk,ico,title,desc,col,ord){ meta.seen=meta.seen||{}; if(meta.seen[sk]) return; for(const c of coachQueue) if(c.sk===sk) return; coachQueue.push({sk:sk,ico:ico,title:title,desc:desc,col:col,ord:ord}); }
  function coach(key){ if(!LESSONS[key]) return; queueLesson(key,LESSONS[key].ico,t('coach_'+key),t('coach_'+key+'d'),LESSONS[key].col,LESSON_ORDER.indexOf(key)); }   // statische Kern-Lektion
  function coachDyn(sk,ico,title,desc,col){ queueLesson(sk,ico,title,desc,col,999); }   // dynamische Lektion (Upgrade/Waffe/Effekt) mit eigenem Text
  function tickCoach(dt){
    if(coachCard){ if(coachCard.app<1) coachCard.app=Math.min(1,coachCard.app+dt/0.28); if(coachCard.closing){ coachCard.ct+=dt/0.4; if(coachCard.ct>=1) coachCard=null; } }
    if(coachCd>0) coachCd-=dt;
    if(!coachCard && coachCd<=0 && coachQueue.length && bossIntroT<=0 && !(banner && banner.t>0.6)){   // ein Fokuspunkt: nicht gleichzeitig mit prominentem Banner
      coachQueue.sort((a,b)=>a.ord-b.ord);   // Kern-Lektionen (Curriculum) vor dynamischen
      const L=coachQueue.shift(); meta.seen=meta.seen||{}; meta.seen[L.sk]=1; saveMeta();
      coachCard={sk:L.sk,ico:L.ico,title:L.title,desc:L.desc,col:L.col,app:0,closing:false,ct:0};
      coachPause=true;   // Spiel einfrieren, bis getippt wird
      flash=Math.min(0.32,(flash||0)+0.10); flashColor=L.col;
      try{ beep(560,0.07,'sine',0.16); setTimeout(()=>beep(840,0.08,'sine',0.14),90); }catch(_){ }
      vibe(12);
    }
  }
  function coachFreezeTick(dt){ if(coachCard && coachCard.app<1) coachCard.app=Math.min(1,coachCard.app+dt/0.28); }   // im Freeze nur die Karte einblenden
  function resumeCoach(){ if(!coachPause) return; coachPause=false; coachBtn=null; if(coachCard) coachCard.closing=true; coachCd=2.6; invuln=Math.max(invuln||0,0.6);
    if(player){ tgt.x=player.x; tgt.y=player.y; } inputSuppressUntil=performance.now()+320;   // Schiff bleibt stehen: Ziel aufs Schiff snappen + Eingabe kurz sperren → kein Sprung zur Button-Position (Click-Through-Fix)
    try{ beep(720,0.06,'square',0.2); }catch(_){ } }   // WEITER-Button → weiter, kurze Unverwundbarkeit zum Schutz
  // Schadenszahl (weiß = normal, rot = Krit). Mit Soft-Cap gegen Spam & nur wenn aktiviert.
  function floatDamage(x,y,amt,crit){ if(!opt.dmg||floaters.length>66) return; const a=Math.round(amt); if(a<=0) return;
    floaters.push({x:x+rand(-5,5),y,text:crit?(a+'!'):''+a,color:crit?'#ff3b3b':'#ffffff',size:crit?20:13,life:1,vy:-58,vx:rand(-14,14),dr:crit?1.25:1.8}); }
  function hexA(h,a){ const n=parseInt(h.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
  // Glow-Sprite-Cache: vorgerenderter Radial-Glow je Farbe. Additiv per drawImage gezeichnet ersetzt
  // den teuren ctx.shadowBlur pro Objekt (mobil der Haupt-Flaschenhals bei vielen Bolzen/Kugeln/Gegnern).
  const _glow={};
  function glowSprite(col){ let c=_glow[col]; if(c) return c;
    const sz=64; c=document.createElement('canvas'); c.width=c.height=sz; const g=c.getContext('2d');
    const gd=g.createRadialGradient(sz/2,sz/2,0,sz/2,sz/2,sz/2);
    gd.addColorStop(0,hexA(col,0.85)); gd.addColorStop(0.35,hexA(col,0.33)); gd.addColorStop(1,hexA(col,0));
    g.fillStyle=gd; g.fillRect(0,0,sz,sz); _glow[col]=c; return c; }

  // ---------- Hintergrund-Themes (pro Level, weicher Crossfade) ----------
  const THEMES=[
    {top:[16,2,31],  mid:[26,5,51],  bot:[8,1,15],   grid:[255,46,136], sun:[255,46,136]}, // Synthwave
    {top:[44,10,22], mid:[92,24,30], bot:[16,3,10],  grid:[255,120,60], sun:[255,90,40]},  // Sonnenuntergang
    {top:[2,22,30],  mid:[6,52,58],  bot:[2,10,18],  grid:[40,255,180], sun:[40,255,200]}, // Aurora
    {top:[4,8,42],   mid:[12,22,74], bot:[2,4,18],   grid:[60,150,255], sun:[80,170,255]}, // Tiefsee
    {top:[30,5,44],  mid:[64,16,86], bot:[12,2,22],  grid:[200,70,255], sun:[255,90,225]}, // Vaporwave
    {top:[42,5,5],   mid:[88,18,6],  bot:[20,2,2],   grid:[255,90,30],  sun:[255,130,20]}  // Inferno
  ];
  const BOSS_THEME={top:[35,2,26],mid:[46,6,38],bot:[8,1,15],grid:[255,120,0],sun:[255,120,0]};
  const cloneTheme=t=>({top:t.top.slice(),mid:t.mid.slice(),bot:t.bot.slice(),grid:t.grid.slice(),sun:t.sun.slice()});
  let curBg=cloneTheme(THEMES[0]);
  const rgbS=a=>`rgb(${Math.round(a[0])},${Math.round(a[1])},${Math.round(a[2])})`;
  function lerpBg(target){ const k=0.07; for(const key of ['top','mid','bot','grid','sun']) for(let i=0;i<3;i++) curBg[key][i]+=(target[key][i]-curBg[key][i])*k; }

  // ---------- Upgrades ----------
  const UPGRADES=[
    {id:'radar',ico:'📡',name:'Radar',desc:'Near-Miss-Radius +45%',max:3,pickup:true,apply:()=>{mods.nearRadius*=1.45;}},
    {id:'shieldgen',ico:'🛡️',name:'Schildgenerator',desc:'+1 Schild jetzt & +1 nach jedem Boss',max:3,apply:()=>{shields=Math.min(shields+1,5);mods.shieldPerBoss++;}},
    {id:'glass',ico:'💎',name:'Glaskanone',desc:'+30% Punkte, aber +15% Hitbox',max:2,apply:()=>{mods.scoreMult*=1.3;mods.playerR*=1.15;player.r=mods.playerR;}},
    {id:'nimble',ico:'⚡',name:'Flink',desc:'Reaktion deutlich schneller',max:3,apply:()=>{mods.follow+=6;}},
    {id:'small',ico:'🔻',name:'Kompakt',desc:'Hitbox −18%',max:2,apply:()=>{mods.playerR*=0.82;player.r=mods.playerR;}},
    {id:'orbval',ico:'🪙',name:'Münz-Veredelung',desc:'Münzen geben +60% Wert',max:3,pickup:true,apply:()=>{mods.orbValueMult*=1.6;}},
    {id:'magnet',ico:'🧲',name:'Magnetfeld',desc:'Dauerhafter Münz-Sog',max:3,pickup:true,apply:()=>{mods.magnetPassive+=130;}},
    {id:'loot',ico:'🎁',name:'Glücksbringer',desc:'Power-Ups erscheinen 50% öfter',max:2,pickup:true,apply:()=>{mods.powerupRate*=1.5;}},
    {id:'combo',ico:'🔗',name:'Combo-Anker',desc:'Jeder Near-Miss gibt +1 Combo extra',max:2,pickup:true,apply:()=>{mods.comboBonus+=1;}},
    {id:'reflex',ico:'🕙',name:'Reflex-Kern',desc:'Slow-Mo hält 50% länger',max:2,pickup:true,apply:()=>{mods.slowmoMult*=1.5;}},
    {id:'heart',ico:'💗',name:'Extra-Herz',desc:'+1 Leben (max 6)',max:3,apply:()=>{lives=Math.min(lives+1,6);}},
    // ---- Sprung-Dash-Upgrades ----
    {id:'jumpcd',ico:'🌀',name:'Sprung-Kondensator',desc:'Sprung lädt 25% schneller',max:3,jump:true,apply:()=>{mods.jumpCd*=0.75;}},
    {id:'jumpdouble',ico:'🪽',name:'Doppelsprung',desc:'+1 Sprung-Ladung',max:2,jump:true,apply:()=>{mods.jumpMax++; jumpStock=Math.min(mods.jumpMax,jumpStock+1);}},
    {id:'jumpstomp',ico:'💥',name:'Stoß-Landung',desc:'Landung: Schockwelle räumt Hindernisse & Kugeln',max:1,jump:true,apply:()=>{mods.jumpStomp=1;}},
    {id:'jumpphase',ico:'👻',name:'Phasenflug',desc:'Sprung dauert länger & vaultet weiter',max:2,jump:true,apply:()=>{mods.jumpDur+=0.18; mods.jumpVault+=0.4;}},
    {id:'jumpshock',ico:'⚡',name:'Schocklandung',desc:'Landung entlädt einen Kettenblitz (stärker mit Kette)',max:1,jump:true,apply:()=>{mods.jumpShock=1;}},
    {id:'jumpfrost',ico:'🧊',name:'Frostlandung',desc:'Landung vereist Gegner ringsum (stärker mit Frost)',max:1,jump:true,apply:()=>{mods.jumpFrost=1;}},
    // ---- Fluch-Karten (lustige Nerfs, Deal with the Devil) ----
    {id:'banana',ico:'🍌',name:'Bananen-Boden',desc:'Schiff rutscht & driftet (Trägheit), aber +65% Punkte',max:1,curse:true,apply:()=>{mods.follow*=0.6;mods.slip=true;mods.scoreMult*=1.65;}},
    {id:'smol',ico:'🫠',name:'Smol Brain',desc:'Hitbox +28% (stapelt), dafür +50% Punkte',max:1,curse:true,apply:()=>{mods.playerR*=1.28;if(player)player.r=mods.playerR;mods.scoreMult*=1.5;}},
    {id:'energy',ico:'⚡',name:'Energy-Drink-OD',desc:'Hindernisse +22% schneller, Near-Radius +75%',max:1,curse:true,apply:()=>{mods.obSpeed*=1.22;mods.nearRadius*=1.75;}},
    {id:'blind',ico:'🌫️',name:'Drip aber blind',desc:'Sicht eingeschränkt, dafür +90% Punkte',max:1,curse:true,apply:()=>{mods.fog=Math.min(0.82,mods.fog+0.55);mods.scoreMult*=1.9;}},
    {id:'clown',ico:'🤡',name:'Clown-Modus',desc:'30% dichteres Gedränge, aber Münzen ×2 Wert',max:1,curse:true,apply:()=>{mods.spawnMult*=0.7;mods.orbValueMult*=2;}},
    {id:'mirror',ico:'🪞',name:'Spiegelwelt',desc:'30 Sek. gespiegelte Steuerung (einmalig, Timer im HUD), +55% Punkte',max:1,curse:true,apply:()=>{mods.mirror=true;mirrorOn=true;if(effects)effects.mirror=MIR_DUR;mods.scoreMult*=1.55;}},
    // ---- Globale Waffen-Passive (KEIN Slot, gelten für alle Waffen, multiplikativ = abnehmender Ertrag) ----
    {id:'amp',  ico:'💥',name:'Verstärker',desc:'+22% Schaden für ALLE Waffen',max:6,wpass:true,apply:()=>{ mods.wDmgMult*=1.22; }},
    {id:'tempo',ico:'⏩',name:'Taktung',   desc:'ALLE Waffen feuern 14% schneller',max:5,wpass:true,apply:()=>{ mods.wRate*=1.14; }},
    {id:'crit', ico:'🎯',name:'Zielfokus', desc:'+11% Kritische Treffer (×2 Schaden, rot)',max:5,wpass:true,apply:()=>{ mods.critBase=(mods.critBase||0)+0.11; }},
    {id:'critdmg', ico:'💢',name:'Wuchttreffer', desc:'Mehr Krit-Schaden (abflachend)',max:4,wpass:true,apply:()=>{}}   // critMult kommt zentral aus critDmgCurve() in recalcArsenal()
  ];
  // ---------- Flüche: zeitlich begrenzt; Effekt UND Timer stapeln bei Mehrfach-Aufsammeln ----------
  // Dauer je Fluch unterschiedlich – harte Flüche kürzer, milde/lustige länger.
  // Stärke je Fluch (2 = kräftig, 3 = hart/krasser Bonus) → steuert Dauer (stärker = kürzer) UND Effekt-Stapel-Cap (stärker = weniger) → nie „zu krass"
  const CURSE_POW={banana:3,smol:2,energy:3,blind:3,clown:3,mirror:3};
  const curseDur=id=>({1:32,2:26,3:19}[CURSE_POW[id]||2]);
  const curseCap=id=>({1:4,2:3,3:2}[CURSE_POW[id]||2]);
  const CURSE_COL={banana:'#ffd23f',smol:'#ff8ad6',energy:'#ffe600',blind:'#9a86c9',clown:'#ff2e88',mirror:'#ff3b6b'};
  // on() backt den Effekt in mods, off() macht GENAU eine Anwendung rückgängig (multiplikativ/additiv invertierbar)
  const CURSE_FX={
    banana:{on:()=>{mods.follow*=0.6;mods.slip=true;mods.scoreMult*=1.65;}, off:()=>{mods.follow/=0.6;mods.scoreMult/=1.65;}},
    smol:  {on:()=>{mods.scoreMult*=1.5;}, off:()=>{mods.scoreMult/=1.5;}},   // Größe NICHT mehr in mods.playerR backen → wird pro Frame aus aktiven Stacks berechnet (selbstheilend, kein Drift)
    energy:{on:()=>{mods.nearRadius*=1.75;}, off:()=>{mods.nearRadius/=1.75;}},   // obSpeed NICHT mehr hier backen → folgt pro Frame den aktiven Stacks (selbstheilend)
    blind: {on:()=>{mods.scoreMult*=1.9;}, off:()=>{mods.scoreMult/=1.9;}},   // Nebel NICHT mehr hier backen → wird pro Frame aus aktiven Stacks berechnet (selbstheilend)
    clown: {on:()=>{mods.orbValueMult*=2;}, off:()=>{mods.orbValueMult/=2;}},   // spawnMult NICHT mehr hier backen → folgt pro Frame den aktiven Stacks (selbstheilend)
    mirror:{on:()=>{mods.mirror=true;mirrorOn=true;mods.scoreMult*=1.55;}, off:()=>{mods.scoreMult/=1.55;}}
  };
  function triggerCurse(id){ const fx=CURSE_FX[id]; if(!fx) return; const dur=curseDur(id);
    const ex=activeCurses.find(a=>a.id===id);
    if(ex){ if(ex.stacks<curseCap(id)){ fx.on(); ex.stacks++; } ex.t+=dur; ex.max=ex.t; }   // erneut gesammelt → Effekt (bis Cap) + Timer addieren
    else { fx.on(); activeCurses.push({id,t:dur,max:dur,stacks:1}); } }
  function endCurse(a){ const fx=CURSE_FX[a.id]; if(fx) for(let k=0;k<(a.stacks||1);k++) fx.off();
    if(a.id==='mirror'){ mods.mirror=false; mirrorOn=false; }
    if(a.id==='banana'){ mods.slip=false; if(player){ player.vx=0; player.vy=0; } } }
  function tickCurses(dt){ for(let i=activeCurses.length-1;i>=0;i--){ const a=activeCurses[i]; a.t-=dt;
    if(a.t<=0){ endCurse(a); activeCurses.splice(i,1);
      floatText(player?player.x:W/2,(player?player.y:H/2)-30,uName(a.id)+' '+t('curseOver'),'#19f0ff',16);
      flash=Math.max(flash||0,0.2); flashColor='#19f0ff'; sfxPow(); } } }
  // ---- ARSENAL: 5 eigenständige Auto-Feuer-Waffen, je mit 2 Skill-Gabelungen (D2-light) ----
  // Jede Waffe belegt 1 Slot. Pfad-Wahl = Sidegrade (gleich stark, anderer Stil).
  const WEAPONS=[
    {id:'blaster',ico:'🔫',col:'#caffff',forks:[['rapid','heavy'],['scatter','precise'],['overcharge','stabil'],['volley','lance']]},
    {id:'missile',ico:'🚀',col:'#ff9a2e',forks:[['swarm','warhead'],['shrapnel','incendiary'],['cluster','bunker'],['wide_aoe','rapidload']]},
    {id:'flame',  ico:'🔥',col:'#ffae4d',forks:[['ember','wildfire'],['accel','consume'],['inferno','lingering'],['blaze','firestorm']]},
    {id:'frost',  ico:'❄️',col:'#8fe8ff',forks:[['permafrost','glaciate'],['shatter','brittle'],['deepfreeze','blizzard'],['absolute','frostbite']]},
    {id:'chain',  ico:'⛓️',col:'#9be7ff',forks:[['fork','highv'],['stormhit','dischargeaoe'],['arc','conduit'],['tempest','paralyze']]},
    {id:'nova',   ico:'🟣',col:'#c45bff',forks:[['shock','overload'],['repel','staticfield'],['expand','collapse'],['pulsar','singularity']]},
    {id:'rail',   ico:'⚡',col:'#fff27a',forks:[['charged','autoload'],['wide','overdrive'],['piercebeam','hypervelocity'],['gigawatt','repeater']]}
  ];
  const WID=Object.fromEntries(WEAPONS.map(w=>[w.id,w]));
  // (Fork-Stufen sind jetzt rein Skillpunkt-basiert – keine fu_-Coin-Items mehr)
  // Spielstil-Archetypen je Waffe → sofort lesbare Build-Identität (Karte zeigt Stil, man muss keine Stats rechnen)
  const ARCH={
    blaster:{ico:'⚡',de:'Dauerfeuer',en:'Sustained',fr:'Tir continu'},
    missile:{ico:'💥',de:'Fläche',    en:'Splash',   fr:'Zone'},
    flame:  {ico:'🔥',de:'Anhaltend', en:'Burn',     fr:'Brûlure'},
    frost:  {ico:'🧊',de:'Kontrolle', en:'Control',  fr:'Contrôle'},
    chain:  {ico:'🔗',de:'Ketten',    en:'Chains',   fr:'Chaînes'},
    nova:   {ico:'🌀',de:'Puls',      en:'Pulse',    fr:'Pulsation'},
    rail:   {ico:'🩸',de:'Burst',     en:'Burst',    fr:'Burst'}
  };
  const wArch=id=>{ const a=ARCH[id]; return a?(a.ico+' '+(a[lang]||a.en)):''; };
  // Synergien (auto, wenn beide Waffen besessen). [id, [weaponA, weaponB], ico]
  const SYNERGIES=[
    {id:'thermo', pair:['flame','frost'],  ico:'🌋'},
    {id:'super',  pair:['frost','chain'],  ico:'🔱'},
    {id:'napalm', pair:['missile','flame'],ico:'🧨'},
    {id:'tesla',  pair:['blaster','chain'],ico:'🌩️'},
    {id:'icebomb',pair:['frost','missile'],ico:'🧊'},
    {id:'cryonova',pair:['nova','frost'],  ico:'❄️'},
    {id:'plasma', pair:['rail','flame'],   ico:'☄️'},
    {id:'voltspark',pair:['chain','nova'], ico:'🟣'},
    {id:'pyrobolt', pair:['blaster','flame'],ico:'🔥'},
    {id:'railnova', pair:['rail','nova'],   ico:'🌀'},
    {id:'cryoshot', pair:['blaster','frost'],ico:'🧊'},
    {id:'novabomb', pair:['missile','nova'],ico:'🌑'},
    {id:'railchain',pair:['rail','chain'],  ico:'🔗'},
    {id:'barrage',  pair:['blaster','missile'],ico:'💢'},
    {id:'shockbolt',pair:['blaster','nova'],   ico:'🟪'},
    {id:'overclock',pair:['blaster','rail'],   ico:'⏩'},
    {id:'clusterarc',pair:['missile','chain'], ico:'🪢'},
    {id:'siege',    pair:['missile','rail'],   ico:'💣'},
    {id:'wildarc',  pair:['flame','chain'],    ico:'🔥'},
    {id:'embernova',pair:['flame','nova'],     ico:'🌋'},
    {id:'cryorail', pair:['frost','rail'],     ico:'❄️'}
  ];
  const SID=Object.fromEntries(SYNERGIES.map(s=>[s.id,s]));
  // FUSIONEN 2.0: Synergien werden in der Werkstatt GEKAUFT (sy_<id>) und dann FREI kombiniert (bis Slot-Limit)
  for(const s of SYNERGIES) META.push({id:'sy_'+s.id, ico:s.ico, base:420, max:1});
  META.push({id:'synslot', ico:'🧬', base:900, max:2});   // +1 gleichzeitig aktive Fusion (2 Basis → max 4)
  // Farb-Mischung: aktive Fusion färbt die Waffe sichtbar als Mix beider Partnertypen (Projektil, Glow, Trail)
  const hexC=h=>{ const v=parseInt(h.slice(1),16); return [(v>>16)&255,(v>>8)&255,v&255]; };
  const mixCol=(a,b,t)=>{ const A=hexC(a),B=hexC(b),m=i=>Math.round(A[i]+(B[i]-A[i])*t); return '#'+((1<<24)|(m(0)<<16)|(m(1)<<8)|m(2)).toString(16).slice(1); };
  const synPartner=wid=>{ for(const id of activeSyn){ const s=SID[id]; if(!s) continue; if(s.pair[0]===wid) return s.pair[1]; if(s.pair[1]===wid) return s.pair[0]; } return null; };
  const wepCol=wid=>{ const p=synPartner(wid); return p?mixCol(WID[wid].col,WID[p].col,0.45):WID[wid].col; };
  // Pixel-Schiff-Editor: Pixel-Pakete (heben das Mal-Budget) + Glow-Pixel-Freischaltung
  META.push({id:'pxpack', ico:'✏️', base:160, max:6});   // je Stufe +12 Pixel
  META.push({id:'pxglow', ico:'✨', base:350, max:1});    // Glow-Pixel freischalten
  const PIX_BASE=14, PIX_PER=12;
  const pixBudget=()=>PIX_BASE+metaLvl('pxpack')*PIX_PER;
  const glowUnlocked=()=>metaLvl('pxglow')>0;
  const synBought=id=> metaLvl('sy_'+id)>0 || mode==='zen';   // Werkstatt-Kauf (Bestand per Migration übernommen); Zen = Sandbox
  const synUnlocked=id=> synBought(id);
  const synSlots=()=> 2+metaLvl('synslot');          // gleichzeitig aktive Fusionen (2 Basis, Werkstatt: bis 4)
  let arsenal={slots:3,w:{}}, wpn={}, syn={}, activeSyn=[], synSeen={}, synNovas=[], synCharge={}, zenSynSel=null;   // activeSyn=belegte Fusions-Slots; synCharge=Überladung 0..1 je Fusion
  let skillPts=0, arsenalSkillMode=false, arsenalResume=false, arsenalFromMenu=false, arsenalTab='loadout';   // arsenalFromMenu = Hangar aus dem Hauptmenü geöffnet
  let arsenalReturn='start';   // Hub ist EIN Screen für alles (Loadout·Synergien·Werkstatt) → Rückkehrziel je nach Kontext (Menü/Pause/Over/Upgrade/…)
  let statusFromMenu=false;   // Schiffsstatus aus dem Hauptmenü geöffnet (Loadout-Vorschau)
  let statusFromArsenal=false;   // Schiffsstatus aus dem Arsenal geöffnet → dorthin zurück (Loadout sofort prüfen)
  const ownedW=()=>Object.keys(arsenal.w);
  const ownedCount=()=>ownedW().length;
  const synActive=id=>!!syn[id];
  // arsenal.w → aufgelöste Feuerwerte (wpn) + Synergie-Flags (syn). Nach jedem Pick/Drop & bei reset() aufrufen.
  // Krit-Schaden folgt einer abflachend ansteigenden Kurve (Soft-Cap): jeder Punkt bringt weniger,
  // Multiplikator nähert sich ×3.5 an statt linear weiterzuwachsen. pts = Wuchttreffer-Stufen + Wuchtkern-Stufen.
  const critDmgCurve=pts=>1.5*(1-Math.exp(-Math.max(0,pts)/4));
  function recalcArsenal(){
    mods.critMult=2+critDmgCurve((upgradeCounts['critdmg']||0)+metaLvl('critdmgcore'));   // zentral aus der Kurve (nicht mehr linear aufaddiert)
    const dm=Math.min(9,(mods.wDmgMult||1)*(1+0.06*(mods.oc||0))), rm=Math.min(2.8,mods.wRate||1), has=id=>!!arsenal.w[id]; wpn={}; syn={};   // CAPS gegen Runaway: Schaden ≤9×, Feuerrate ≤2.8× (bremst v.a. unbegrenztes Loot-Stacking) · oc = +6%/Stufe
    if(has('blaster')){ const a=arsenal.w.blaster; let rate=3.2,dmg=1.15,bolts=1,spread=0.13,pierce=0;
      if(a.f1==='rapid'){rate*=1.5;dmg*=0.8;} if(a.f1==='heavy'){rate*=0.7;dmg*=2.0;}
      if(a.f2==='scatter'){bolts+=2;spread+=0.06;dmg*=0.78;} if(a.f2==='precise'){pierce+=2;dmg*=1.4;}
      if(a.f3==='overcharge'){dmg*=1.4;rate*=0.85;} if(a.f3==='stabil'){spread*=0.4;rate*=1.2;}
      if(a.f4==='volley'){bolts+=1;dmg*=0.85;} if(a.f4==='lance'){pierce+=2;dmg*=1.3;}
      wpn.blaster={rate:rate*rm,dmg:dmg*dm,bolts,spread,pierce}; }
    if(has('missile')){ const a=arsenal.w.missile; let rate=0.6,dmg=4.4,aoe=70,count=1;
      if(a.f1==='swarm'){count=2;dmg*=0.62;aoe*=0.78;} if(a.f1==='warhead'){dmg*=1.55;aoe*=1.5;rate*=0.8;}
      if(a.f3==='cluster'){count+=1;dmg*=0.7;} if(a.f3==='bunker'){dmg*=1.5;rate*=0.8;}
      if(a.f4==='wide_aoe'){aoe*=1.5;} if(a.f4==='rapidload'){rate*=1.6;dmg*=0.7;}
      wpn.missile={rate:rate*rm,dmg:dmg*dm,aoe,count,shrapnel:a.f2==='shrapnel',incendiary:a.f2==='incendiary'}; }
    if(has('flame')){ const a=arsenal.w.flame; let rate=2.2,dmg=0.6,dot=1.45,dur=2.4;
      if(a.f1==='ember'){dot*=2.1;} let spread=a.f1==='wildfire';
      if(a.f2==='accel'){dot*=1.7;dur*=0.62;}
      if(a.f3==='inferno'){dot*=1.85;} if(a.f3==='lingering'){dur*=1.9;}
      if(a.f4==='blaze'){rate*=1.5;dmg*=0.8;} if(a.f4==='firestorm'){dot*=1.4;dur*=1.4;spread=true;}
      wpn.flame={rate:rate*rm,dmg:dmg*dm,dot:dot*dm,dur,spread,consume:a.f2==='consume'}; }
    mods.brittle=false; mods.shatter=false;
    if(has('frost')){ const a=arsenal.w.frost; let rate=2.2,dmg=1.6,slowDur=1.7,slowAmt=0.42;
      if(a.f1==='permafrost'){slowDur*=2.0;slowAmt=0.28;} let freeze=a.f1==='glaciate';
      if(a.f3==='deepfreeze'){slowAmt*=0.55;slowDur*=1.5;} if(a.f3==='blizzard'){rate*=1.5;dmg*=0.75;}
      if(a.f4==='absolute'){freeze=true;} if(a.f4==='frostbite'){dmg*=1.85;rate*=0.85;}
      wpn.frost={rate:rate*rm,dmg:dmg*dm,slowDur,slowAmt,freeze,shatter:a.f2==='shatter',brittle:a.f2==='brittle'};
      mods.brittle=a.f2==='brittle'; mods.shatter=a.f2==='shatter'; }   // SPRÖDE / SPLITTERBRUCH gelten global an gefrorenen Zielen
    if(has('chain')){ const a=arsenal.w.chain; let rate=1.25,dmg=2.5,jumps=4,stun=0;
      if(a.f1==='fork'){jumps+=3;dmg*=0.72;} if(a.f1==='highv'){jumps=Math.max(1,jumps-1);dmg*=2.1;stun=0.5;}
      if(a.f3==='arc'){jumps+=2;dmg*=0.82;} if(a.f3==='conduit'){dmg*=1.8;rate*=0.85;}
      if(a.f4==='tempest'){rate*=1.5;dmg*=0.8;} if(a.f4==='paralyze'){stun+=0.5;dmg*=1.3;}
      wpn.chain={rate:rate*rm,dmg:dmg*dm,jumps,stun,onHit:a.f2==='stormhit',aoe:a.f2==='dischargeaoe'}; }
    if(has('nova')){ const a=arsenal.w.nova; let rate=0.9,dmg=3.2,radius=120,knock=false,slow=false;
      if(a.f1==='shock'){radius*=1.5;} if(a.f1==='overload'){dmg*=1.9;rate*=0.7;}
      if(a.f2==='repel'){knock=true;} if(a.f2==='staticfield'){slow=true;}
      if(a.f3==='expand'){radius*=1.5;} if(a.f3==='collapse'){dmg*=1.8;radius*=0.9;}
      if(a.f4==='pulsar'){rate*=1.6;dmg*=0.75;} if(a.f4==='singularity'){knock=true;slow=true;dmg*=1.3;}
      wpn.nova={rate:rate*rm,dmg:dmg*dm,radius,knock,slow}; }
    if(has('rail')){ const a=arsenal.w.rail; let rate=0.7,dmg=5.4,width=26;
      if(a.f1==='charged'){dmg*=2.0;rate*=0.65;} if(a.f1==='autoload'){rate*=1.7;dmg*=0.65;}
      if(a.f2==='wide'){width*=2;} if(a.f2==='overdrive'){dmg*=1.7;}
      if(a.f3==='piercebeam'){width*=1.6;} if(a.f3==='hypervelocity'){dmg*=1.8;rate*=0.8;}
      if(a.f4==='gigawatt'){dmg*=2.1;rate*=0.7;} if(a.f4==='repeater'){rate*=1.8;dmg*=0.6;}
      wpn.rail={rate:rate*rm,dmg:dmg*dm,width,burn:false}; }
    // Fusionen: gekauft (Werkstatt) + beide Waffen ausgerüstet → wählbar; aktiv = Auswahl (meta.synSel), gedeckelt auf synSlots()
    const cand=SYNERGIES.filter(s=>has(s.pair[0])&&has(s.pair[1])&&synBought(s.id)).map(s=>s.id);
    if(mode==='zen'){ if(!Array.isArray(zenSynSel)) zenSynSel=cand.slice(0,synSlots());   // Zen: transiente Auswahl (persistente meta.synSel bleibt unberührt)
      activeSyn=zenSynSel.filter(id=>cand.includes(id)).slice(0,synSlots()); }
    else { if(!Array.isArray(meta.synSel)) meta.synSel=[]; if(!meta.synOff) meta.synOff={};
      for(const id of cand){ if(!meta.synSel.includes(id)&&!meta.synOff[id]&&meta.synSel.filter(x=>cand.includes(x)).length<synSlots()) meta.synSel.push(id); }   // neu verfügbare Fusion rückt automatisch in einen freien Slot (jederzeit abwählbar)
      activeSyn=meta.synSel.filter(id=>cand.includes(id)).slice(0,synSlots()); }
    for(const s of SYNERGIES) syn[s.id]=activeSyn.includes(s.id);
    for(const id of activeSyn) if(synCharge[id]===undefined) synCharge[id]=0;
    if(syn.super&&wpn.chain) wpn.chain.jumps+=1;                 // SUPRALEITER: +1 Kettensprung (entschärft)
    if(syn.cryonova&&wpn.nova) wpn.nova.slow=true;              // CRYONOVA: Puls verlangsamt (stärker, s. fireNova)
    if(syn.plasma&&wpn.rail) wpn.rail.burn=true;                // PLASMA: Schiene entzündet
    if(syn.overclock&&wpn.blaster) wpn.blaster.rate*=1.6;       // ÜBERTAKTUNG: Blaster 60% schneller
    if(syn.siege&&wpn.missile){ wpn.missile.dmg*=1.5; wpn.missile.aoe*=1.5; }   // BELAGERUNG: Raketen stärker & größer
    // Krit: Passiv-Basis + Blaster-Pfad „Präzision"
    mods.crit=Math.min(0.75,(mods.critBase||0)+((arsenal.w.blaster&&arsenal.w.blaster.f2==='precise')?0.15:0));
    mods.gun=has('blaster')?1:0;
  }
  const critFactor=()=>1+(mods.crit||0)*((mods.critMult||2)-1);   // erwarteter Krit-Multiplikator
  // Krit-Wurf auf einen Basis-Schaden → {dmg, crit}
  function rollHit(base){ if((mods.crit||0)>0 && Math.random()<mods.crit){ coachDyn('crithit','🎯',t('cefCrit'),t('cefCritd'),'#ff2e6e'); return {dmg:base*(mods.critMult||2),crit:true}; } return {dmg:base,crit:false}; }
  // ---- Schiffsstatus: aus dem aktuellen Loadout abgeleitete Kennzahlen (Synergien sind bereits in wpn/mods eingerechnet) ----
  const sNrm=(v,max)=>Math.max(0,Math.min(100, (v/max)*100));
  // Sättigende Normalisierung: half = Wert, bei dem die Achse 50% erreicht. Differenziert sauber über früh→spät,
  // ohne dass starke Builds sofort am Anschlag (100%) kleben → die Radar-FORM bleibt aussagekräftig.
  const sat=(v,half)=>{ v=Math.max(0,v); return 100*v/(v+half); };
  function computeShipStats(){
    const cf=critFactor();                       // erwarteter Krit-Multiplikator (Chance × Wucht)
    const W=wpn; let dps=0, perW=[], aoe=0, cc=0, tempo=0, nW=0;
    const push=(id,d)=>{ perW.push({id,dps:d}); dps+=d; };
    if(W.blaster){ const w=W.blaster; push('blaster', w.rate*w.dmg*(w.bolts||1)*cf); aoe+=(w.bolts-1)*6+(w.pierce||0)*4; tempo+=w.rate; nW++; }
    if(W.missile){ const w=W.missile; push('missile', w.rate*w.dmg*(w.count||1)*cf); aoe+=(w.aoe/70)*15*(w.count||1); tempo+=w.rate; nW++; }
    if(W.flame){ const w=W.flame; push('flame', (w.dmg*w.rate+w.dot)*cf); aoe+=w.spread?16:6; cc+=3; tempo+=w.rate; nW++; }
    if(W.frost){ const w=W.frost; push('frost', w.rate*w.dmg*cf); cc+=(w.freeze?11:6)+(w.slowAmt||0)*5; aoe+=w.shatter?8:0; tempo+=w.rate; nW++; }
    if(W.chain){ const w=W.chain; push('chain', w.rate*w.dmg*cf); aoe+=(w.jumps||0)*3.2; cc+=w.stun?6:0; tempo+=w.rate; nW++; }
    if(W.nova){ const w=W.nova; push('nova', w.rate*w.dmg*cf); aoe+=(w.radius/120)*16; cc+=(w.slow?5:0)+(w.knock?5:0); tempo+=w.rate; nW++; }
    if(W.rail){ const w=W.rail; push('rail', w.rate*w.dmg*(w.width/26)*cf); aoe+=(w.width/26)*6; tempo+=w.rate; nW++; }
    perW.sort((a,b)=>b.dps-a.dps);
    const luck=mods.powerupRate||1;
    const survival=(lives||0)+(shields||0)*0.9+((13/(mods.playerR||13))-1)*8+(mods.shieldPerBoss||0)*2;
    const critBonus=cf-1;                                                                 // erwarteter Krit-Mehrschaden (Chance × Wucht)
    const comboEng=Math.max(0,(mods.nearRadius||30)/30-1)*10 + (mods.magnetPassive||0)/40 + (mods.comboBonus||0)*6;   // Scoring-Motor: Near-Miss-Reichweite + Münz-Sog + Combo-Anker
    // 6 Build-Säulen, sättigend normalisiert (half-Werte an die aktuelle Balance kalibriert: Basis-Build niedrig, spezialisierter Build spitzt eine Achse)
    const radar=[
      {key:'power',  ico:'🔥', val:sat(dps,70)},
      {key:'prec',   ico:'🎯', val:sat(critBonus,0.7)},
      {key:'area',   ico:'💥', val:sat(aoe,30)},
      {key:'control',ico:'❄️', val:sat(cc,18)},
      {key:'surv',   ico:'🛡️', val:sat(survival,9)},
      {key:'combo',  ico:'✦',  val:sat(comboEng,16)}
    ];
    return { dps, perW, cf, crit:mods.crit||0, critMult:mods.critMult||2, lives:lives||0, shields:shields||0,
      luck, scoreMult:mods.scoreMult||1, coinMult:chipMult(), hull:mods.playerR||13, nearR:mods.nearRadius||30,
      oc:mods.oc||0, jumpMax:mods.jumpMax||1, tempo, wDmg:mods.wDmgMult||1, wRate:mods.wRate||1, syns:(activeSyn||[]).slice(), radar };
  }
  // Zentrale CC-Anwendung (Slow/Freeze) – respektiert Elite-Widerstand (o.ccRes) & CC-Sättigung (o.ccSat).
  // Wiederholtes Vereisen wirkt zunehmend schwächer → kein „dauerhaft eingefrorenes" Lategame, Ausweichen bleibt relevant.
  function applySlow(o,dur,amt){ if(!o) return;
    const res=o.ccRes||0;
    o.ccSat=Math.min(0.70,(o.ccSat||0)+0.15);              // Anti-Snowball: schnellere & stärkere Kälte-Gewöhnung (Decke 0.70 = nur noch leicht bremsbar)
    const floor=Math.max(0.12,res,o.ccSat);                // Frost VERLANGSAMT, friert nie komplett ein (min. 12% Resttempo) → kein Dauer-Lock des Feldes
    o.slow=Math.max(o.slow||0,dur*(1-res*0.5));            // Elites: kürzere Slow-Dauer
    o.slowAmt=Math.max(floor,Math.min(o.slowAmt!=null?o.slowAmt:1,amt)); }   // Sättigungs-Boden GEWINNT: bei Dauer-CC kriecht der Boden nach oben (kein Permafrost-Lock des Feldes)
  // Waffen-Level/Fork-Logik: lvl1=Basis, lvl2=Gabelung1 gewählt, lvl3=Gabelung2 gewählt
  function nextNode(id){ const a=arsenal.w[id]; if(!a) return 'new';
    for(const s of ['f1','f2','f3','f4']){ if(!a[s]) return forkShopOpen(id,s)?s:null; }   // nächster Slot nur, wenn in Werkstatt freigeschaltet
    return null; }
  function weaponMaxed(id){ return nextNode(id)===null; }

  function reset(){
    mods={nearRadius:30,scoreMult:1,playerR:13,follow:14,orbValueMult:1,magnetPassive:0,powerupRate:1,comboBonus:0,shieldPerBoss:0,slowmoMult:1,
          obSpeed:1,spawnMult:1,fog:0,invertX:false,mirror:false,slip:false,
          gun:0,wDmgMult:1,wRate:1,critBase:0,crit:0,critMult:2,oc:0,
          jumpCd:10,jumpMax:1,jumpDur:0.55,jumpVault:1,jumpStomp:0};   // Sprung-Dash: Cooldown, Ladungen, Dauer, Vault-Weite, Stoß-Landung (per Upgrade)
    arsenal={slots:3,w:{}}; wpn={}; syn={}; activeSyn=[]; synSeen={}; synNovas=[]; synCharge={}; zenSynSel=null; skillPts=0; arsenalSkillMode=false;
    player={x:W/2,y:H*0.72,r:mods.playerR,trail:[]};
    tgt.x=W/2; tgt.y=H*0.72;
    obstacles=[]; orbs=[]; powerups=[]; clearParticles(); floaters=[]; lasers=[]; bullets=[]; gems=[]; sps=[]; coinz=[]; loot=[]; beams=[]; zaps=[]; novas=[]; gibs=[]; rankIdx=0; coinT=rand(1,2);
    score=0; displayScore=0; combo=0; multiplier=1; comboCoinBonus=0;
    elapsed=0; spawnT=0; orbT=0; powerupT=rand(7,12); difficulty=1;
    shake=0; flash=0; flashColor='#19f0ff'; nearGlow=0; nearCount=0; deathFlash=0; deathT=0; deathGather=false;
    level=1; levelDuration=(mode==='hardcore')?18:24; levelTimer=levelDuration; unlocked=['straight'];  // Level etwas länger → ruhigerer Form-/Song-Wechsel
    upStep=Math.round(500*(1+(diffMul-1)*0.6)); nextUpgradeAt=upStep;                                    // Upgrade-Karten: höhere Schwierigkeit → höhere Schwelle → seltener
    bossActive=false; bossNumber=1; bossTimer=combatDur(); bossPhaseT=0; laserSpawnT=0; bossIntroT=0;
    banner=null; effects={slowmo:0,magnet:0,double:0,mirror:0}; mirrorOn=false; activeCurses=[]; shields=0; invuln=0; upgradeCounts={}; lives=3; runContinues=0; deathCause=''; pendingContinue=false; jumpCharge=0; jumpStock=mods.jumpMax; jumping=0; jumpClutch=0; jumpClutchFired=false; jumpSeq=0; flungT=0; jumpReadyT=0; lastBossName='';
    curSong=Math.floor(Math.random()*SONGS.length); curBg=cloneTheme(THEMES[0]); commentT=rand(12,20); egg67done=false; egg67T=0;
    comboTime=0; comboTimeMax=3.4; beatIdx=0; beatPulse=0; spawnQueued=false; orbQueued=false;
    director=0.5; overdrive=false; tBlast=0; tMiss=rand(0.3,0.7); tFlame=0; tFrost=0; tChain=rand(0.4,0.8); tNova=rand(0.5,1.0); tRail=rand(0.4,0.9); teslaCount=0; bossPending=false; boss=null; ebullets=[]; gemT=rand(8,13);
    endless=false; madness=0; wonThisRun=false; laserFinal=false;
    runOrbs=0; runPerfect=0; runBosses=0; madnessTime=0; runMaxMult=1; runSPgain=0; runHits=0; onbDrops=0; runChipsPaid=0; runChipsEarned=0; coinSaveAcc=0; runJumps=0; runLoot=0; inputDirty=false; idleStretch=0; runIdleMax=0; runIdleAcc=0; breatherT=rand(24,32); breatherActive=0; chestT=rand(30,46); mkCount=0; mkTimer=0; coachQueue=[]; coachCd=0; coachCard=null; coachPause=false; pickMissions();
    flowI=1; skillBias=computeSkillBias();   // Flow-Regler zuruecksetzen + Skill-Offset aus den letzten Runs lernen
    shipSeed=((daily?dailySeed():(Math.random()*1e9))|0)||1;
  }
  // Aktueller Bestwert-Schlüssel (Daily hat eigenen Rekord pro Tag)
  function curBest(){ return daily?(best.daily||0):(best[mode]||0); }
  function setBest(v){ if(daily) best.daily=v; else best[mode]=v; }
  function refillCombo(){ comboTimeMax=Math.max(1.7,(mode==='zen'?4.4:3.4)-multiplier*0.12); comboTime=comboTimeMax; }
  // Combo vorbei → den durch die Combo erspielten Münz-Zusatzgewinn kurz aufpoppen (Beleg, dass sich die Combo gelohnt hat)
  function flushComboBonus(x,y){ const b=Math.round(comboCoinBonus); comboCoinBonus=0;
    if(b>=1){ floatText(x,y-46,'COMBO +🪙'+b,'#ffd23f',20); } }
  // ---------- Adaptives Balancing: Spielerstärke -> härtere Gegner ----------
  // Gesamt-DPS des Arsenals (Flächen-/Multi-Treffer eingerechnet) → für HP-Skalierung
  function gunDps(){ let d=0;
    if(wpn.blaster) d+=wpn.blaster.dmg*wpn.blaster.bolts*wpn.blaster.rate;
    if(wpn.missile) d+=wpn.missile.dmg*wpn.missile.count*wpn.missile.rate*1.4;
    if(wpn.flame)   d+=(wpn.flame.dmg+wpn.flame.dot*wpn.flame.dur)*wpn.flame.rate;
    if(wpn.frost)   d+=wpn.frost.dmg*wpn.frost.rate;
    if(wpn.chain)   d+=wpn.chain.dmg*wpn.chain.jumps*wpn.chain.rate*0.6;
    if(wpn.nova)    d+=wpn.nova.dmg*wpn.nova.rate*2;   // kleiner Radius → moderateres Flächengewicht (faire HP-Skalierung)
    if(wpn.rail)    d+=wpn.rail.dmg*wpn.rail.rate*1.6;
    return d*critFactor(); }
  // Effektive Einzelziel-DPS gegen den Boss (kein Flächen-Bonus, Raketen ×2 wie in explodeMissile)
  function bossDps(){ let d=0.5;
    if(wpn.blaster) d+=wpn.blaster.dmg*wpn.blaster.bolts*wpn.blaster.rate;
    if(wpn.missile) d+=wpn.missile.dmg*wpn.missile.count*wpn.missile.rate*2;
    if(wpn.flame)   d+=(wpn.flame.dmg+wpn.flame.dot*wpn.flame.dur)*wpn.flame.rate;
    if(wpn.frost)   d+=wpn.frost.dmg*wpn.frost.rate;
    if(wpn.chain)   d+=wpn.chain.dmg*wpn.chain.rate;
    if(wpn.rail)    d+=wpn.rail.dmg*1.5*wpn.rail.rate;
    return d*critFactor(); }
  function pwrSurv(){ let up=0; for(const k in upgradeCounts) up+=upgradeCounts[k];
    return up*0.6 + shields*0.4 + Math.max(0,lives-3)*0.5 + (13-mods.playerR)/13*4
      + Math.max(0,(mods.nearRadius-30)/30) + Math.max(0,(mods.follow-14)/8) + Math.max(0,mods.scoreMult-1); }
  // DDA-Kopplung: ein UNgedeckelter Zusatzdruck, der nur greift, wenn der Spieler souverän cruist
  // (director hoch = viele Near-Misses/Orbs ohne Treffer). Wird man getroffen, fällt director → Druck lässt nach.
  // So bleibt der Grund-Cap als Schutz für schwache Spieler, starke laufen der Schwierigkeit aber nicht mehr davon.
  const ddaPush=()=>Math.max(0,director-0.55)*2.2;
  // Endgame-Eskalation: ab Lvl 12 darf der Druck die Sättigungs-Decke durchbrechen, die starke Builds OP werden lässt.
  // lateDom senkt die Dichte-Floors mit der Endgame-Tiefe (max −0.14). Gegated über Level → frühe Spieler unberührt.
  const lateDom=()=>Math.min(0.14,Math.max(0,(level||1)-12)*0.012);
  const difSpd =()=>(1+Math.min(0.55,pwrSurv()*0.020)+pwrSurv()*0.013*ddaPush()+Math.min(0.45,Math.max(0,(level||1)-12)*0.010)*Math.min(1,0.4+ddaPush())+(endless?Math.min(0.5,madness*0.3):0))*flowI;   // + Endgame-Tempo (gegated über souveränes Spiel)
  const difDen =()=>Math.max(0.30-lateDom(),1-Math.min(0.30,pwrSurv()*0.012)-pwrSurv()*0.009*ddaPush()-(endless?Math.min(0.45,madness*0.5):0));   // Floor sinkt im Endgame → dichtere Wellen gegen OP-Builds
  // „Coverage": echtes Screen-Clear-Potenzial (Waffen + aktive Fusionen) – treibt die Elite-Häufigkeit,
  // denn genau diese Flächendeckung lässt das Ausweichen sonst verschwinden.
  const coverage  =()=>opt.guns?(ownedCount()+activeSyn.length*1.3):0;
  const eliteChance=()=>(opt.guns&&level>=3)?Math.min(0.5,(0.02+(level-2)*0.025+Math.min(0.18,coverage()*0.018)+(endless?madness*0.5:0))*flowI):0;   // Elites ab Lvl 3; coverage-Anteil gedeckelt → bricht die Elite↔Loot-Snowball-Schleife
  const flankChance=()=>(opt.guns&&level>=4)?Math.min(0.16,(0.01+(level-3)*0.01+coverage()*0.008)*flowI):0;   // Flanker (Camper-Konter) ab Lvl 4
  const shieldChance=()=>(opt.guns&&level>=5)?Math.min(0.14,(0.01+(level-4)*0.009+coverage()*0.006)*flowI):0;   // Schild-Gegner (Konter gegen reine Bolzen-DPS) ab Lvl 5
  // Zwischen-Runs lernen: aus den letzten Runs (gleicher Modus) ein Skill-Offset ableiten.
  // Viele Treffer & niedriges Level → struggelt → leichter (negativ). Wenig Treffer & hohes Level → souveraen → haerter (positiv). Gedeckelt ±0.15.
  function computeSkillBias(){ try{ const log=JSON.parse(localStorage.getItem('thronerush_tlog')||'[]'); if(!Array.isArray(log)) return 0;
    const rec=log.slice(-10).filter(r=>r&&r.mode===mode); if(rec.length<3) return 0;
    const avg=(k)=>rec.reduce((s,r)=>s+(+r[k]||0),0)/rec.length;
    const bias=(avg('lvl')-3)*0.03 - (avg('hits')-3)*0.04;
    return Math.max(-0.15,Math.min(0.15,bias)); }catch(e){ return 0; } }
  // Obstacles-HP: folgt der Gesamt-DPS (konstante Time-to-Kill) + sanfter Level-Druck,
  // damit sich die Upgrade-Jagd lohnt – wer nicht aufrüstet, wird langsam überrannt.
  const difHp  =()=>(1.1+Math.pow(Math.max(0,gunDps()),0.88)*0.26+(level-1)*0.26)*(BAL.enemyHp||1);   // ~konstante TTK: HP wächst nun fast LINEAR mit DPS (Pow 0.88 statt sqrt) → starke Builds räumen dichte Wellen nicht mehr instant ab, der Dodge-Druck bleibt. BAL.enemyHp = Auto-Balance-Hebel
  const introT =()=>Math.max(0,1-elapsed/28);   // Butter-Start: noch längere, sanfte Schonung (~28s) → anfangs ganz wenige, langsame Hindernisse, fadet linear aus
  // DPS-gekoppeltes Tempo: mehr Feuerkraft → schnellere Obstacles. Hält den Ausweich-Druck konstant (mit wenig DPS hat man Zeit zu zerstören, mit viel DPS kommt es schneller). Sanft & gedeckelt.
  const DPS_BASE=4;   // ~Start-Blaster-DPS als Referenz
  const dpsSpd =()=>1+Math.min(0.12,Math.max(0,gunDps()/DPS_BASE-1)*0.012);   // ENTKOPPELT: starke Builds machen das Spiel kaum noch schneller (max +12%)
  const dpsDen =()=>1-Math.min(0.45,Math.max(0,gunDps()/DPS_BASE-1)*0.05);   // KOMPENSATION: mehr DPS -> deutlich dichtere Wellen (Druck per Anzahl/Qualität statt Tempo)
  function finalNum(){ return mode==='hardcore'?10:8; }
  function combatDur(){ return mode==='hardcore'?30:38; }   // Kampfphase pro Level vor dem Boss (länger → Zeit zum Aufrüsten)
  // Boss entkommen → Level NICHT geschafft: gleiche Stufe nochmal (Loadout bleibt, man wird stärker)
  function restartLevel(){ boss=null; bossActive=false; ebullets=[]; lasers=[]; bossPending=false;
    bossTimer=combatDur();
    banner={text:t('bossEscaped'),sub:t('lvlAgain')+' '+level,t:3.2,color:'#ff9a2e'};
    flash=0.4; flashColor='#ff9a2e'; sfxWarn(); vibe([50,40,50]); }
  function startGame(m){
    goFullscreenSoft();                          // Smartphone: sauberer Vollbild ab Spielstart
    if(m==='daily'){ daily=true; mode='normal'; }
    else if(m){ daily=false; mode=m; }       // m leer (NOCHMAL) → vorigen Typ beibehalten
    useSeed=daily;
    const dd=(DIFFS[meta.diff||0]||DIFFS[0]);                    // glatte Werte direkt aus der Tabelle
    diffSpd=1+dd.spd/100; diffHp=1+dd.hp/100; diffDen=1+dd.den/100; diffChip=dd.coin;
    diffMul=1+dd.hp/100;                                         // Gesamtanspruch (HP-basiert) für upStep-Skalierung
    if(daily){ seedState=dailySeed()|0;
      if(best.dailyDate!==dailyLabel()){ best.daily=0; best.dailyDate=dailyLabel(); saveScores(); } }
    unlockAudio(); reset(); applyMeta(); state=S.PLAY;
    if(daily) unlockAch('daily'); meta.stats=meta.stats||{}; meta.stats['mode_'+mode]=1;
    if(meta.stats.mode_normal&&meta.stats.mode_hardcore&&meta.stats.mode_zen) unlockAch('allmodes'); saveMeta();
    document.getElementById('start').classList.add('hidden');
    document.getElementById('over').classList.add('hidden');
    document.getElementById('upgrade').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden'); showCockpit(true);
    modeNameEl.textContent=daily?(t('modeDaily')+' '+dailyLabel()):modeLabel(mode); bestHud.textContent=t('best')+' '+fmt(curBest());
    if(daily) banner={text:t('daily2'),sub:dailyLabel(),t:2.6,color:'#ffe600'};
    setTimeout(()=>{ if(state===S.PLAY) lore('intro'); },1500);   // einmaliges Story-Intro beim allerersten Run
    zenExitBtn.style.display='block';
    sfxStart(); vibe(20); lastT=performance.now(); saveRunT=0; saveRun();   // sofort sichern → Reload direkt nach Start setzt diesen Run fort
  }
  function toMenu(){ if(state===S.PLAY||state===S.UPGRADE||state===S.PAUSE){ if(score>curBest()){ setBest(score); saveScores(); } saveRun(); }   // laufender Run wird NICHT verworfen → im Menü via „FORTSETZEN" weiterspielbar
    state=S.MENU; document.getElementById('hud').classList.add('hidden'); showCockpit(false);
    document.getElementById('over').classList.add('hidden'); document.getElementById('upgrade').classList.add('hidden');
    document.getElementById('pause').classList.add('hidden'); document.getElementById('shop').classList.add('hidden');
    document.getElementById('settings').classList.add('hidden'); document.getElementById('ach').classList.add('hidden');
    document.getElementById('arsenalView').classList.add('hidden');
    document.getElementById('start').classList.remove('hidden'); updateMenuChips(); updateResumeBtn();
  }
  // Menü: „FORTSETZEN"-Button nur zeigen, wenn ein fortsetzbarer Lauf-Snapshot existiert
  function updateResumeBtn(){ const b=document.getElementById('resumeRunBtn'); if(!b) return; const s=loadRunSnap();
    if(s){ b.classList.remove('hidden'); b.innerHTML='▶ '+t('continueRun')+' · '+t('level')+' '+(s.level||1); }
    else b.classList.add('hidden'); }
  function menuResume(){ const s=loadRunSnap(); if(!s){ updateResumeBtn(); return; } restoreRun(s); }
  function pauseGame(){ if(state!==S.PLAY) return; state=S.PAUSE; saveRun();
    pauseSub.textContent=modeLabel(mode)+' · '+Math.round(score)+' '+t('points');
    renderMissions();
    document.getElementById('pause').classList.remove('hidden'); beep(440,0.08,'square',0.2); }
  function resumeGame(){ if(state!==S.PAUSE) return; state=S.PLAY; invuln=Math.max(invuln,0.9);
    document.getElementById('pause').classList.add('hidden'); lastT=performance.now(); beep(660,0.08,'square',0.2); }

  // ---------- Lauf-Snapshot: Reload/Tab-Wechsel im Browser verliert den laufenden Run nicht mehr ----------
  // Gespeichert wird nur der DAUERHAFTE Zustand (Loadout, Score, Level, Leben, Position, Timer …).
  // Das transiente Hindernisfeld wird beim Wiederherstellen geleert (robust statt fragiler Live-Restore);
  // man landet pausiert an seiner Stelle und tippt zum Weiterspielen. Lauf zählt normal weiter.
  const RUN_KEY='thronerush_run';
  let saveRunT=0;
  function saveRun(){ if(!(state===S.PLAY||state===S.PAUSE||state===S.UPGRADE)||!player) return;
    try{ localStorage.setItem(RUN_KEY, JSON.stringify({ v:1, ts:Date.now(), mode, daily, useSeed, seedState,
      score, displayScore, combo, multiplier,
      level, levelTimer, levelDuration, unlocked, nextUpgradeAt, upStep,
      elapsed, difficulty, spawnT, orbT, powerupT,
      shields, lives, invuln, mods, upgradeCounts, effects, mirrorOn,
      activeCurses:activeCurses.map(a=>({id:a.id,t:a.t,max:a.max,stacks:a.stacks})),
      arsenal, activeSyn, synSeen, skillPts,
      player:{x:player.x,y:player.y,r:player.r},
      bossNumber, director, overdrive, endless, madness, wonThisRun, laserFinal,
      comboTime, comboTimeMax, beatIdx,
      runOrbs, runPerfect, runBosses, madnessTime, runMaxMult, runChipsPaid, runChipsEarned, coinSaveAcc,
      shipSeed, curSong, commentT, egg67done, egg67T,
      tBlast, tMiss, tFlame, tFrost, tChain, tNova, tRail, teslaCount, gemT })); }catch(e){} }
  function clearRun(){ try{ localStorage.removeItem(RUN_KEY); }catch(e){} }
  function loadRunSnap(){ try{ const r=JSON.parse(localStorage.getItem(RUN_KEY));
    if(r&&typeof r==='object'&&r.v===1&&(Date.now()-(r.ts||0))<24*3600*1000&&r.mode&&r.player) return r; }catch(e){} return null; }
  function restoreRun(s){
    const num=(v,d)=>typeof v==='number'&&isFinite(v)?v:d;
    // Schwierigkeit wie beim Spielstart aus meta.diff ableiten (VOR reset → upStep stimmt)
    const dd=(DIFFS[meta.diff||0]||DIFFS[0]); diffSpd=1+dd.spd/100; diffHp=1+dd.hp/100; diffDen=1+dd.den/100; diffChip=dd.coin; diffMul=1+dd.hp/100;
    mode=(s.mode==='hardcore'||s.mode==='zen')?s.mode:'normal'; daily=!!s.daily; useSeed=!!s.useSeed; if(s.seedState!=null) seedState=s.seedState|0;
    reset();                                                            // frische Arrays + Defaults …
    // … dann den gespeicherten dauerhaften Zustand drüberlegen
    score=num(s.score,0); displayScore=num(s.displayScore,score); combo=num(s.combo,0); multiplier=num(s.multiplier,1);
    level=num(s.level,1); levelDuration=num(s.levelDuration,levelDuration); levelTimer=num(s.levelTimer,levelDuration);
    if(Array.isArray(s.unlocked)&&s.unlocked.length) unlocked=s.unlocked.slice();
    nextUpgradeAt=num(s.nextUpgradeAt,nextUpgradeAt); upStep=num(s.upStep,upStep);
    elapsed=num(s.elapsed,0); difficulty=num(s.difficulty,1); spawnT=num(s.spawnT,0); orbT=num(s.orbT,0); powerupT=num(s.powerupT,8);
    shields=num(s.shields,0); lives=num(s.lives,3); invuln=Math.max(num(s.invuln,0),0.9);
    if(s.mods) mods=Object.assign(mods,s.mods);
    if(s.effects) effects=Object.assign(effects,s.effects); mirrorOn=!!s.mirrorOn;
    activeCurses=Array.isArray(s.activeCurses)?s.activeCurses.map(a=>({id:a.id,t:+a.t||0,max:+a.max||0,stacks:Math.max(1,+a.stacks||1)})):[];   // Fluch-Timer wiederherstellen (Effekt steckt bereits in mods)
    if(s.upgradeCounts&&typeof s.upgradeCounts==='object') upgradeCounts=s.upgradeCounts;
    if(s.arsenal&&s.arsenal.w) arsenal={slots:num(s.arsenal.slots,3),w:s.arsenal.w};
    if(Array.isArray(s.activeSyn)) activeSyn=s.activeSyn.slice();
    if(s.synSeen&&typeof s.synSeen==='object') synSeen=s.synSeen; skillPts=num(s.skillPts,0);
    bossNumber=num(s.bossNumber,1);
    director=num(s.director,0.5); overdrive=!!s.overdrive; endless=!!s.endless; madness=num(s.madness,0); wonThisRun=!!s.wonThisRun; laserFinal=!!s.laserFinal;
    comboTime=num(s.comboTime,0); comboTimeMax=num(s.comboTimeMax,3.4); beatIdx=num(s.beatIdx,0)|0;
    runOrbs=num(s.runOrbs,0); runPerfect=num(s.runPerfect,0); runBosses=num(s.runBosses,0); madnessTime=num(s.madnessTime,0); runMaxMult=num(s.runMaxMult,1);
    runChipsPaid=num(s.runChipsPaid,0); runChipsEarned=num(s.runChipsEarned,0); coinSaveAcc=num(s.coinSaveAcc,0); if(!missions.length) pickMissions();
    shipSeed=num(s.shipSeed,shipSeed); curSong=num(s.curSong,curSong)|0; commentT=num(s.commentT,15); egg67done=!!s.egg67done; egg67T=num(s.egg67T,0);
    tBlast=num(s.tBlast,0); tMiss=num(s.tMiss,0.5); tFlame=num(s.tFlame,0); tFrost=num(s.tFrost,0); tChain=num(s.tChain,0.6); tNova=num(s.tNova,0.7); tRail=num(s.tRail,0.6); teslaCount=num(s.teslaCount,0)|0; gemT=num(s.gemT,10);
    if(s.player){ player.x=num(s.player.x,W/2); player.y=num(s.player.y,H*0.72); player.r=num(s.player.r,mods.playerR); player.trail=[]; tgt.x=player.x; tgt.y=player.y; }
    recalcArsenal();                                                    // Waffen + Fusionen aus arsenal.w/mods neu aufbauen
    // einen laufenden Boss NICHT mitten im Telegraph wiederherstellen → frische Kampfphase desselben Levels
    bossActive=false; boss=null; bossPending=false; bossTimer=combatDur(); bossPhaseT=0; laserSpawnT=0; ebullets=[]; lasers=[];
    curBg=cloneTheme(THEMES[((level||1)-1)%THEMES.length]); banner=null;
    // UI in den pausierten Zustand bringen – tippen/Resume zum Weiterspielen
    try{ scoreEl.textContent=fmt(displayScore); comboEl.textContent='x'+multiplier; if(coinHud) coinHud.textContent='🪙 '+fmt(meta.chips||0); }catch(e){}
    state=S.PAUSE;
    document.getElementById('start').classList.add('hidden');
    document.getElementById('over').classList.add('hidden');
    document.getElementById('upgrade').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden'); showCockpit(true);
    zenExitBtn.style.display='block';
    try{ modeNameEl.textContent=daily?(t('modeDaily')+' '+dailyLabel()):modeLabel(mode); bestHud.textContent=t('best')+' '+fmt(curBest()); }catch(e){}
    try{ pauseSub.textContent=modeLabel(mode)+' · '+Math.round(score)+' '+t('points'); }catch(e){}
    document.getElementById('pause').classList.remove('hidden');
    lastT=performance.now();
  }

  function addScore(n){ score+=Math.round(n*mods.scoreMult*(effects.double>0?2:1)); }
  function setMult(){ const m=1+Math.floor(combo/4); if(m>multiplier){ const prev=multiplier; multiplier=m; onComboUp(m,prev); } else multiplier=m; if(m>runMaxMult)runMaxMult=m; }
  // Combo-Hitze: Farbe steigt mit dem Multiplikator (cyan → mint → gold → orange → heißes Pink)
  function comboColor(m){ return m>=20?'#ff2e88':m>=15?'#ff9a2e':m>=10?'#ffe600':m>=5?'#2effc0':'#19f0ff'; }
  function onComboUp(m,prev){ const col=comboColor(m); floatText(player.x,player.y-30,'x'+m,col,20+Math.min(14,m)); checkComboAch(m);
    if(m>=5 && Math.floor(m/5)>Math.floor((prev||1)/5)){   // Meilenstein überschritten (auch bei Sprüngen): Flash + Shake + Ring-Puls + steigender Ton
      const tier=Math.floor(m/5); flash=Math.max(flash||0,0.28+Math.min(0.3,tier*0.06)); flashColor=col; shake=Math.max(shake,8+Math.min(16,tier*3));
      for(let i=0;i<14;i++){ const a=i/14*6.28; emitP(player.x,player.y,Math.cos(a)*240,Math.sin(a)*240,0.08,col,rand(3,6)); }
      try{ beep(440+m*18,0.07,'square',0.18); setTimeout(()=>beep(660+m*22,0.09,'square',0.16),70); }catch(_){}
      vibe([20,30,20]); }
    const w=(P('combo')||{})[m];
    if(w){ banner={text:w,sub:'',t:1.4,color:col}; vibe([15,25,15]); }
    if(m>=2) coach('combo'); }
  function bumpCombo(){ comboEl.classList.remove('bump'); void comboEl.offsetWidth; comboEl.classList.add('bump'); }

  // ---------- Easteregg: CODE 67 ----------
  function sfx67(){ if(!actx||!opt.sfx) return; [[392,0],[523,150],[392,360],[523,510]].forEach(([f,d])=>setTimeout(()=>beep(f,0.16,'square',0.32),d)); }
  function trigger67(){ if(state!==S.PLAY||egg67T>0) return; egg67T=8;
    banner={text:'6️⃣ 7️⃣',sub:'CODE 67 — six seveeen',t:2.8,color:'#ffe600'};
    sfx67(); vibe([67,67,67]); addScore(67); shields=Math.min(shields+1,5); flash=0.55; flashColor='#ffe600';
    for(let i=0;i<18;i++) floatText(rand(40,W-40),rand(H*0.2,H*0.8),'6 7',pick(['#ffe600','#19f0ff','#ff2e88']),rand(16,30));
    spawnParticles(player.x,player.y,'#ffe600',26,300);
  }

  // ---------- Spawning ----------
  function pickPattern(){ if(unlocked.length===1) return 'straight';
    if(grnd()<0.4) return 'straight'; return gpick(unlocked.slice(1)); }
  // Verschnaufpause mit kleiner positiver Wendung (Münz-Regen / Geschenk / Zeitlupe) – Feel-Good-Rhythmus
  function triggerBreather(){ breatherActive=rand(3.2,4.4); const kind=(Math.random()*3)|0;
    if(kind===0){ banner={text:t('breather'),sub:t('brCoins'),t:2.4,color:'#2effc0'}; for(let i=0;i<5;i++) setTimeout(()=>{ if(state===S.PLAY) spawnCoin(grand(50,W-50),-20); }, i*200); }
    else if(kind===1){ banner={text:t('breather'),sub:t('brGift'),t:2.4,color:'#19f0ff'}; if(powerups.length<3) spawnPowerup(); }
    else { banner={text:t('breather'),sub:t('brSlow'),t:2.4,color:'#5b9bff'}; effects.slowmo=Math.max(effects.slowmo,2.4); }
    flash=Math.max(flash||0,0.25); flashColor='#2effc0'; beep(523,0.12,'sine',0.18); setTimeout(()=>beep(784,0.14,'sine',0.16),120); }
  function spawnObstacle(){
    const key=pickPattern();
    const hc=mode==='hardcore'?1.5:1, zc=mode==='zen'?0.75:1;
    const sp=(46+Math.min(level*3.6,100)+Math.min(elapsed*0.45,46))*hc*zc*(mods.obSpeed||1)*(1+(director-0.5)*0.12)*dpsSpd()*difSpd()*(1-0.5*introT())*0.96*diffSpd;   // Level-Tempo-Cap 72→100 (Endgame bleibt nicht stehen); difSpd trägt zusätzlich die Endgame-/Dominanz-Eskalation
    const o={pattern:key,near:false,scored:false,trail:[],rot:0,vr:grand(-3,3),mv:(Math.random()*12)|0};   // mv = Mini-Monster-Variante (prozedurales Sci-Fi-Vieh)
    if(key==='straight'){ const sh=gpick(['rect','long','diamond']); o.shape=sh; o.color='#ff2e88';
      if(sh==='long'){o.w=grand(90,170);o.h=grand(20,28);} else if(sh==='diamond'){o.w=grand(34,52);o.h=o.w;} else {o.w=grand(30,58);o.h=grand(30,58);}
      o.cx=grand(o.w/2,W-o.w/2); o.cy=-o.h; o.vx=sh==='long'?0:grand(-30,30); o.vy=sp+grand(0,50);
    } else if(key==='sine'){ o.shape='capsule'; o.color='#ff5ea8'; o.w=grand(42,66); o.h=grand(22,30);
      o.baseX=grand(W*0.2,W*0.8); o.amp=grand(70,130); o.freq=grand(0.012,0.02); o.phase=grnd()*6.28; o.cx=o.baseX; o.cy=-o.h; o.vy=sp*0.95;
    } else if(key==='drift'){ o.shape='tri'; o.color='#ff7a2e'; o.w=grand(36,54); o.h=grand(40,58);
      o.cx=grand(W*0.2,W*0.8); o.cy=-o.h; o.vx=grand(-40,40); o.ax=grand(-70,70); o.vy=sp*0.9;
    } else if(key==='orbit'){ o.shape='hex'; o.color='#ff2e6e'; o.w=grand(34,48); o.h=o.w;
      o.radius=grand(50,95); o.baseX=grand(o.radius+24,W-o.radius-24); o.centerY=-o.radius; o.ang=grnd()*6.28; o.angVel=grand(1.6,2.6)*(grnd()<.5?1:-1); o.vy=sp*0.7; o.cx=o.baseX; o.cy=o.centerY;
    } else if(key==='zigzag'){ o.shape='star'; o.color='#ff3b3b'; o.w=grand(32,46); o.h=o.w;
      o.cx=grand(o.w,W-o.w); o.cy=-o.h; o.vx=grand(150,230)*(grnd()<.5?1:-1); o.vy=sp*0.85;
    } else if(key==='pendulum'){ o.shape='ring'; o.color='#ff2eaa'; o.w=grand(36,52); o.h=o.w;
      o.baseX=grand(W*0.3,W*0.7); o.swing=grand(90,150); o.ang=grnd()*6.28; o.angVel=grand(2,3.2); o.vy=sp*0.8; o.cx=o.baseX; o.cy=-o.h;
    }
    o.color=REG_COLS[(Math.random()*REG_COLS.length)|0];   // Farb-Vielfalt für normale Gegner (Specials überschreiben unten ihre Identitätsfarbe)
    o.maxHp=Math.max(1,Math.round(((o.w+o.h)/46+(o.shape==='long'?2:0)+(o.shape==='rect'?1:0))*difHp()*diffHp));
    o.hp=o.maxHp; o.hitFlash=0;
    const specials=obstacles.reduce((n,e)=>n+((e.elite||e.flank||e.shielded)?1:0),0), canSpecial=specials<Math.min(5,2+Math.floor((level||1)/4));   // gleichzeitige Sonder-Gegner deckeln → kein Schirm voller Homing/Schild (fair lesbar)
    // ---- Elite/Panzer: überlebt den Screen-Clear & widersteht CC → erzwingt im Lategame wieder echtes Ausweichen ----
    if(canSpecial && grnd()<eliteChance()*(BAL.eliteChance||1)){
      o.elite=true; o.ccRes=0.62; lore('relic');       // stark CC-resistent: kaum bremsbar, nie einfrierbar (Konter gegen reine CC-Builds) · Elites tragen Relikte → Lore
      o.maxHp=Math.round(o.maxHp*2.8)+3; o.hp=o.maxHp; // zäh: weglasern dauert, er kommt näher (Elites = Anker-Ziele, während Trash schmilzt)
      o.vy*=0.84; if(o.vx) o.vx*=0.84;                // langsamer = lesbarer, bedrohlich heranschwebender Tank
      o.color='#c45bff'; coachDyn('enemy_elite','🛡️',t('ceElite'),t('ceEliteD'),'#c45bff');
    } else if(canSpecial && grnd()<flankChance()){                  // FLANKER: schnell, wenig HP, jagt deine Position
      o.flank=true; o.pattern='flank'; o.shape='tri'; o.w=grand(28,38); o.h=Math.round(o.w*1.25); o.color='#ff3a3a';
      o.cx=grand(o.w,W-o.w); o.cy=-o.h; o.vx=0; o.rot=0; o.vy=Math.min(175,sp*0.6+45); o.flankPull=230; o.ccRes=0.45;
      o.maxHp=Math.max(1,Math.round(o.maxHp*0.55)); o.hp=o.maxHp;   // niedrige HP: wegballern oder ausweichen
      coachDyn('enemy_flank','🔻',t('ceFlank'),t('ceFlankD'),'#ff3a3a');
    } else if(canSpecial && grnd()<shieldChance()){                 // SCHILD-GEGNER: Frontschild absorbiert direkte Bolzen, AoE/Elementar umgeht es
      o.shielded=true; o.shieldMax=Math.max(2,Math.round(o.maxHp*1.4)); o.shield=o.shieldMax; o.vy*=0.8; if(o.vx) o.vx*=0.8;
      coachDyn('enemy_shield','🛡️',t('ceShield'),t('ceShieldD'),'#2effc0');
    } else if(canSpecial && level>=4 && grnd()<Math.min(0.13,0.04+(level-4)*0.012)){   // SCHÜTZE: feuert vereinzelt ein langsames, telegrafiertes Geschoss auf dich (ab Lvl 4)
      o.shooter=true; o.fireT=rand(1.6,2.6); o.ccRes=0.2; coachDyn('enemy_shooter','🦑',t('ceShooter'),t('ceShooterD'),'#ff5ea8');
    }
    o.mob = !!(o.elite||o.flank||o.shielded||o.shooter) || (Math.random()<Math.min(0.18,0.04+(level||1)*0.018));   // überwiegend Obstacles, nur SELTEN ein Mob (Spezialgegner immer Mob)
    if(o.mob) rollCreature(o);   // nur Mobs bekommen ein Monster-Aussehen
    obstacles.push(o);
  }
  // ---------- Münz-Pickups: 1/2/5/10, höhere Beträge seltener & größer, manchmal in Gruppen (Combo + Punkte + Geld) ----------
  const COINR={1:10,2:12,5:14.5,10:17.5};
  function coinVal(){ const r=Math.random(); return r<0.58?1:(r<0.84?2:(r<0.955?5:10)); }   // je höher, desto seltener
  const coinMult=()=>Math.min(3,Math.max(1,1+combo*0.08));   // Combo-Münz-Multiplikator 1.0–3.0 (gedeckelt – Coin-Wirtschaft gebremst)
  function spawnCoin(x,y,val){ if(!coinz) coinz=[]; if(coinz.length>70) return; val=val||coinVal();
    coinz.push({x:x!=null?x:grand(28,W-28), y:y!=null?y:-22, vy:72+difficulty*15, r:COINR[val]||10, val, pulse:Math.random()*6.28, rot:0}); }
  function spawnCoinGroup(){ const n=3+((Math.random()*4)|0), cx=grand(70,W-70), v=coinVal();   // ganze Gruppe gleichwertiger Münzen (kleiner Bogen)
    for(let k=0;k<n;k++) spawnCoin(cx+(k-(n-1)/2)*26, -22-Math.abs(k-(n-1)/2)*15, v); }
  const PUP=['shield','slow','magnet','bomb','double'];
  const PUPINFO={shield:{c:'#2effc0',g:'🛡'},slow:{c:'#5b9bff',g:'⏱'},magnet:{c:'#c45bff',g:'🧲'},bomb:{c:'#ff9a2e',g:'💣'},double:{c:'#ffe600',g:'✕2'}};
  function pickPup(){ const noShield=PUP.filter(x=>x!=='shield'); if(shields>=3) return gpick(noShield); let t=gpick(PUP); if(t==='shield'&&grnd()<0.55) t=gpick(noShield); return t; }   // Schild deutlich seltener: nie bei vollem Schild (>=3), sonst 55% Reroll → weniger 'unsterblich'
  // ---------- Run-Missionen (Jetpack-Joyride-Style: 3 frische Ziele pro Run, mehrsprachig) ----------
  const MISSIONS=[
    {id:'near',   g:[25,40], rw:90,  val:()=>nearCount},
    {id:'combo',  g:[10,16], rw:90,  val:()=>runMaxMult},
    {id:'boss',   g:[1,2],   rw:120, val:()=>runBosses, noZen:true},
    {id:'level',  g:[4,7],   rw:100, val:()=>(level||1)},
    {id:'perfect',g:[5,9],   rw:100, val:()=>runPerfect},
    {id:'jump',   g:[6,12],  rw:80,  val:()=>runJumps, noZen:true}
  ];
  function pickMissions(){ const pool=MISSIONS.filter(m=>!(m.noZen&&mode==='zen')); missions=[];
    for(let k=0;k<3 && pool.length;k++){ const m=pool.splice((Math.random()*pool.length)|0,1)[0];
      missions.push({id:m.id,goal:Math.round(rand(m.g[0],m.g[1])),rw:m.rw,val:m.val,done:false}); } }
  function missionText(m){ return (t('msn_'+m.id)||'').replace('%n',m.goal).replace('%w',t('bonusWord')||''); }
  function renderMissions(){ const el=document.getElementById('pauseMissions'); if(!el) return;
    if(!missions.length){ el.innerHTML=''; return; }
    let h='<div class="pmTitle">'+t('missionsTitle')+'</div>';
    for(const m of missions){ const v=Math.min(m.val(),m.goal);
      h+='<div class="pmRow'+(m.done?' done':'')+'"><span>'+(m.done?'✓ ':'')+missionText(m)+'</span><span class="pmProg">'+v+'/'+m.goal+'  🪙'+m.rw+'</span></div>'; }
    el.innerHTML=h; }
  // ---------- Rang-Beförderungen (Warblade-inspiriert, mehrsprachig via P('ranks')) ----------
  const RANK_AT=[0,1500,4000,8000,15000,28000,50000,90000];   // Punkte-Schwellen je Rang
  function rankFor(sc){ let r=0; for(let i=0;i<RANK_AT.length;i++) if(sc>=RANK_AT[i]) r=i; return r; }
  function spawnPowerup(){ const t=pickPup(); powerups.push({x:grand(40,W-40),y:-24,r:16,vy:80+difficulty*18,type:t,pulse:Math.random()*6.28}); }
  // Power-Up-Drop aus zerstörtem Gegner (Chance · von Glück skaliert)
  function dropPowerup(x,y){ if(powerups.length>=4) return; const t=pickPup();
    powerups.push({x:Math.max(20,Math.min(W-20,x)),y,r:16,vy:70,type:t,pulse:Math.random()*6.28}); }
  // ---------- Sammelbare Upgrade-Symbole (positiv & Flüche) ----------
  // Gems sind reine Sammel-Belohnung: Chips-Bonus oder Schild-Auffüllung – optional ein Fluch (Gamble, erst ab ~3 Runs).
  // Echte Upgrades laufen klar & kuratiert über die Level-Up-Karten (keine zufälligen Upgrade-Gems mehr).
  function spawnGem(){
    const cur=(opt.curses&&statN('runs')>=3)?UPGRADES.filter(u=>u.curse&&CURSE_FX[u.id]):[];
    let kind='chips', u=null;
    if(cur.length && Math.random()<0.30){ u=pick(cur); kind='curse'; }        // Fluch: optionales Risiko-Gem, seltener
    else if(shields<3 && Math.random()<0.22){ kind='heal'; }                   // Schild auffüllen: seltener & nur bei wenig Schild (Sustain runter)
    gems.push({x:rand(50,W-50),y:-28,r:17,vy:70+difficulty*14,u,kind,curse:kind==='curse',pulse:Math.random()*6.28,rot:0});
  }
  const GEM_ICO={chips:'🪙',heal:'🛡',curse:'🎲'}, GEM_COL={chips:'#ffe600',heal:'#2effc0'};
  function collectGem(g){
    if(g.kind==='curse'){ const u=g.u, col=CURSE_COL[u.id]||'#ff2e88'; triggerCurse(u.id); unlockAch('curse');
      spawnParticles(g.x,g.y,col,18,240); flash=Math.min(0.5,flash+0.16); flashColor=col;
      banner={text:'🎲 '+uName(u.id).toUpperCase(),sub:uDesc(u.id)+' · '+curseDur(u.id)+'s',t:2.6,color:col}; floatText(g.x,g.y-18,u.ico,col,24);
      beep(220,0.18,'sawtooth',0.3,-60); setTimeout(()=>beep(140,0.2,'square',0.25,-40),80); vibe([40,30,40]); return; }
    if(g.kind==='heal'){ shields=Math.min(shields+1,5); const col=GEM_COL.heal;
      spawnParticles(g.x,g.y,col,18,240); flash=Math.min(0.4,flash+0.12); flashColor=col;
      banner={text:t('pSchild').toUpperCase(),sub:'+1 🛡',t:1.8,color:col}; floatText(g.x,g.y-18,'🛡',col,22); sfxUpgrade(); vibe([15,20,15]); return; }
    const bonus=Math.max(5,Math.round(8+difficulty*5)), col=GEM_COL.chips;   // Chips-Windfall, skaliert leicht mit Tempo
    awardCoins(bonus,g.x,g.y-14,true);
    spawnParticles(g.x,g.y,col,18,240); flash=Math.min(0.4,flash+0.1); flashColor=col;
    banner={text:'🪙 +'+bonus,sub:'',t:1.4,color:col}; sfxUpgrade(); vibe([12,16,12]); }

  // ---------- LOOT (Phase 2): Beute-Drops mit Seltenheits-Stufen (Diablo-inspiriert) ----------
  // Items droppen aus Elites/Bossen (selten aus normalen Gegnern), fallen herab; Einsammeln wirkt sofort
  // für die laufende Runde. Offensiv-Affixe absorbiert die konstante TTK (Phase 1) → Loot = Build-Vielfalt &
  // Schatzsuche statt Power-Flut. Defensiv-Affixe (Hitbox) sind gedeckelt. Run-lokal (persistentes Stash → Phase 3).
  const RARITY=[
    {id:'common',col:'#cfe6ff',w:66,aff:[1,1]},
    {id:'magic', col:'#4ea0ff',w:25,aff:[1,2]},
    {id:'rare',  col:'#ffd23f',w:7, aff:[2,2]},
    {id:'epic',  col:'#ff8a2e',w:2, aff:[2,3],special:true}
  ];
  const AFFIX=[   // bewusst kleine Boosts pro Drop (Loot = Würze, nicht Power-Quelle)
    {id:'dmg',   kind:'off', r:[5,12],   ap:v=>{ mods.wDmgMult*=1+v/100; }},
    {id:'rate',  kind:'off', r:[4,9],    ap:v=>{ mods.wRate*=1+v/100; }},
    {id:'crit',  kind:'off', r:[3,7],    ap:v=>{ mods.critBase=(mods.critBase||0)+v/100; }},
    {id:'score', kind:'util',r:[5,12],   ap:v=>{ mods.scoreMult*=1+v/100; }},
    {id:'coin',  kind:'util',r:[8,16],   ap:v=>{ mods.orbValueMult*=1+v/100; }},
    {id:'magnet',kind:'util',r:[30,80],  ap:v=>{ mods.magnetPassive+=v; }},
    {id:'near',  kind:'util',r:[5,11],   ap:v=>{ mods.nearRadius*=1+v/100; }},
    {id:'hull',  kind:'def', r:[3,6],    ap:v=>{ mods.playerR=Math.max(8,mods.playerR*(1-v/100)); if(player)player.r=mods.playerR; }}   // gedeckelt (Floor 8): keine Hitbox-Runaway
  ];
  const AID=Object.fromEntries(AFFIX.map(a=>[a.id,a]));
  const EPIC_SP=[   // build-definierende Specials (nur Episch), jeweils gedeckelt
    {id:'life',  ap:()=>{ lives=Math.min(lives+1,6); }},
    {id:'shield',ap:()=>{ shields=Math.min(shields+1,5); }},
    {id:'combo', ap:()=>{ mods.comboBonus+=1; }},
    {id:'jump',  ap:()=>{ mods.jumpMax++; jumpStock=Math.min(mods.jumpMax,jumpStock+1); }}
  ];
  function rollRarity(boost){ const ws=RARITY.map((r,i)=>r.w*(boost?Math.pow(boost,i):1)); let tot=ws.reduce((a,b)=>a+b,0),x=Math.random()*tot;
    for(let i=0;i<RARITY.length;i++){ x-=ws[i]; if(x<=0) return RARITY[i]; } return RARITY[0]; }
  function rollItem(rar){ const n=Math.round(rand(rar.aff[0],rar.aff[1])), pool=AFFIX.slice(), affs=[];
    for(let k=0;k<n && pool.length;k++){ const a=pool.splice((Math.random()*pool.length)|0,1)[0]; affs.push({id:a.id,v:Math.round(rand(a.r[0],a.r[1]))}); }
    const it={rar:rar.id,col:rar.col,affs}; if(rar.special) it.sp=pick(EPIC_SP).id; return it; }
  function grantWeaponDrop(){   // Waffen-Kiste: Waffe sofort ausgerüstet + DAUERHAFT entdeckt (→ Werkstatt-Aufrüstung), oder +1 Skillpunkt
    const free=arsenal.slots-ownedCount(), missing=WEAPONS.map(w=>w.id).filter(id=>!arsenal.w[id]);
    if(free>0 && missing.length){
      const undisc=missing.filter(id=>!weaponUnlocked(id));   // bevorzugt noch nicht entdeckte Waffe = echter Fund
      const id=pick(undisc.length?undisc:missing), fresh=!weaponUnlocked(id);
      arsenal.w[id]={lvl:1,f1:null,f2:null,f3:null,f4:null,spent:0};
      if(fresh){ if(!meta.unlocks) meta.unlocks={}; meta.unlocks['w:'+id]=1; saveMeta(); }   // dauerhaft entdeckt → in der Werkstatt mit Coins aufrüstbar
      recalcArsenal(); return {kind:fresh?'discover':'new',id};
    }
    skillPts++; return {kind:'sp'};
  }
  function dropLoot(x,y,source,final){ if(!loot) loot=[]; if(loot.length>14) return;
    const find=Math.min(1.8,(mods.powerupRate||1)*(diffChip||1));   // CAP gegen Snowball: Loot-Rate nicht durch Glück/Grad explodieren lassen
    let chance,boost;
    if(source==='boss'){ chance=1; boost=final?2.2:1.5; }
    else if(source==='elite'){ chance=0.26*find; boost=1.4; }
    else { chance=0.009*find; boost=1; }   // seltener: nur ab und zu ein Drop
    if(Math.random()>=Math.min(1,chance)) return;
    if(opt.guns){ const owned=ownedCount(), wepMul=Math.max(0.12,1-owned*0.26);   // PACING: je mehr Waffen besessen, desto seltener neue Kisten → kein plötzlicher Waffen-Flut
      let wc=(source==='boss'?0.5:(source==='elite'?0.3:0.08))*wepMul;
      if(source==='boss'&&owned<=1) wc=1;   // GARANTIE: erste Waffe vom (frühen) Boss → kein zähes Warten auf die 2. Waffe
      if(Math.random()<wc){ loot.push({x:Math.max(30,Math.min(W-30,x||W/2)),y:y||-20,r:17,vy:56+difficulty*12,it:{wep:true,col:'#caffff'},pulse:Math.random()*6.28,rot:0}); beep(740,0.06,'square',0.2,260); return; } }
    const rar=rollRarity(boost), it=rollItem(rar);
    loot.push({x:Math.max(30,Math.min(W-30,x||W/2)),y:y||-20,r:16,vy:58+difficulty*12,it,pulse:Math.random()*6.28,rot:0});
    if(rar.id==='rare'||rar.id==='epic') beep(880,0.06,'square',0.18,200);
  }
  function affTxt(a){ return '+'+a.v+(a.id==='magnet'?'':'%')+' '+t('aff_'+a.id); }
  function collectLoot(L){ const it=L.it;
    if(it.wep){ const r=grantWeaponDrop();   // Waffen-Kiste
      spawnParticles(L.x,L.y,it.col,18,300); flash=Math.min(0.55,flash+0.16); flashColor=it.col; sfxUpgrade(); vibe([16,22,16]); runLoot++; coach('wcrate');
      if(r.kind==='discover'){ banner={text:'✦ '+t('lootDiscover').toUpperCase(),sub:WID[r.id].ico+' '+wName(r.id),t:2.8,color:'#ffd23f'}; floatText(L.x,L.y-20,WID[r.id].ico,'#ffd23f',30); shake=Math.max(shake,10); beep(1175,0.12,'square',0.28,200); }
      else if(r.kind==='new'){ banner={text:'✦ '+t('lootWeapon').toUpperCase(),sub:WID[r.id].ico+' '+wName(r.id),t:2.4,color:it.col}; floatText(L.x,L.y-20,WID[r.id].ico,it.col,28); }
      else { banner={text:'🔫 '+t('lootCrate'),sub:'💠 +1 '+t('skillPts'),t:2.0,color:'#19f0ff'}; floatText(L.x,L.y-18,'💠','#19f0ff',24); }
      director=Math.min(1,director+0.01); updateAllBalances(); return; }
    let off=false;
    for(const a of it.affs){ const d=AID[a.id]; if(d){ d.ap(a.v); if(d.kind==='off') off=true; } }
    if(it.sp){ const s=EPIC_SP.find(e=>e.id===it.sp); if(s){ s.ap(); off=true; } }
    if(off) recalcArsenal();
    runLoot++; coach('loot');
    const parts=it.affs.map(affTxt); if(it.sp) parts.push(t('aff_'+it.sp));
    spawnParticles(L.x,L.y,it.col,16,260); flash=Math.min(0.5,flash+0.14); flashColor=it.col; sfxUpgrade(); vibe([14,18,14]);
    banner={text:'✦ '+t('loot_'+it.rar).toUpperCase(),sub:parts.join('  ·  '),t:2.2,color:it.col};
    floatText(L.x,L.y-18,'✦',it.col,22); director=Math.min(1,director+0.01);
  }
  function spawnChest(){ if(!opt.guns) return; if(obstacles.some(o=>o.chest)) return;   // schießbare Truhe (nur mit Waffen), max 1 gleichzeitig
    const w=48, hp=Math.max(12,Math.round(gunDps()*1.1+difficulty*3));   // HP ~1–1.5s Beschuss, skaliert mit deinem DPS
    obstacles.push({chest:true,pattern:'straight',shape:'rect',color:'#ffd23f',w:w,h:w,cx:rand(70,W-70),cy:-w,vx:0,vy:34+difficulty*5,maxHp:hp,hp:hp,hitFlash:0,trail:[],rot:0,vr:0,near:false,scored:true});
    beep(523,0.09,'square',0.2); setTimeout(()=>beep(740,0.08,'square',0.18),90); coach('chest'); }
  function openChest(o){ const n=2+((Math.random()*3)|0);   // Truhe kaputtgeschossen → Loot-Explosion (leicht geboostete Rarität)
    for(let k=0;k<n;k++){ const item=(opt.guns&&Math.random()<0.2)?{wep:true,col:'#caffff'}:rollItem(rollRarity(1.6));
      loot.push({x:Math.max(30,Math.min(W-30,o.cx+rand(-48,48))),y:o.cy+rand(-16,12),r:item.wep?17:16,vy:rand(26,74),it:item,pulse:Math.random()*6.28,rot:0}); }
    const cb=Math.round((40+difficulty*12)*(diffChip||1)); awardCoins(cb,o.cx,o.cy-22,true);
    spawnParticles(o.cx,o.cy,'#ffd23f',30,440); pixelBurst(o.cx,o.cy,'#ffd23f',8); flash=Math.min(0.6,flash+0.2); flashColor='#ffd23f'; shake=Math.max(shake,12); sfxKill(); vibe([25,40,25]);
    banner={text:'📦 '+t('chestOpen'),sub:'🪙 +'+cb,t:2.0,color:'#ffd23f'}; director=Math.min(1,director+0.02); lore('vault'); }

  // ---------- Boss ----------
  function startBoss(){
    if(bossNumber>=5) unlockAch('boss5');
    lore('boss');
    const isFinal = !endless && bossNumber===finalNum();
    // Level-Gate: mit Waffen IMMER ein tötbarer Mega-Boss (Level erst geschafft, wenn er stirbt)
    if(opt.guns){ startMegaBoss(isFinal); return; }
    // Laser-Boss (bzw. Laser-Finale, wenn Schießen aus)
    bossActive=true; laserFinal=isFinal; bossPhaseT=isFinal?((mode==='hardcore')?16:14):((mode==='hardcore')?10:8.5); laserSpawnT=0.6;
    banner=isFinal?{text:t('endgegner'),sub:t('finaleSub'),t:2.6,color:'#ff2e88'}:{text:t('bossWave')+bossNumber,sub:'',t:2.2,color:'#ffe600'};
    shake=isFinal?16:10; sfxBoss(); sfxWarn(); vibe([60,40,60]); }
  // ---------- Mega-Boss: prozeduraler Pixel-Sprite-Generator ----------
  function makeRng(s){ s=(s>>>0)||1; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
  const NPRE=['MEGA','GIGA','TURBO','OBER','HYPER','ULTRA','PROTO','OMEGA','KILLER'];
  const NCORE=['GLIBBER','ZAHN','AUGEN','SCHLEIM','NEON','BROCKEN','GRUSEL','WUSEL','KNORP','MATSCH','ZACKEN','BLUBB','GNUBBEL'];
  const NSUF=['MONSTER','VIEH','ZILLA','TRON','KRAKE','KLOPS','BIEST','WUMMS','SCHRECK'];
  // Boss-Namen = bekannte Meme-/Internet-Charaktere, pro Sprache passend zur jeweiligen Netzkultur (keine echten Personen)
  const MEMENAMES={
    de:['@kevin','Erdbeerkäse','halt Stop Andreas','Hans-Peter 3000','Brötchentaste','Digga Deluxe','Sigma Günther','Gigachad Jens','Smombie','Bratan Olaf','Lauch Larry','NPC Norbert','Backpfeifen-Bernd','Cringe-Kevin','Mett-Igel'],
    en:['Big Chungus','Ohio Final Boss','Skibidi Sigma','Gigachad','Karen','Sussy Impostor','Doge Lord','Stonks Master','Pog Champion','Moai 🗿','NPC Norman','Rizzlord Rick','Lord Cringe','Sigma Steve','Gronk'],
    fr:['Jean-Kévin','Camembert Destroyer','Baguette Suprême','Tonton Cringe','Le Frometon','Papy Rizz','Jean-Mi Sigma','Gérard 3000','Croissant Boi','Boomer Bernard','Le Sanglier','Ratio Raymond','NPC Norbert','Gigachad Gégé','Lord Cringe']
  };
  // Mega-Attacken-Namen = Jugendsprache/Meme statt Klo, pro Sprache
  const MEGANAMES={
    de:['RATIO-STURM','CRINGE-KASKADE','SIGMA-SALVE','NPC-SCHWARM','RIZZ-RAKETEN','GIGA-GEWITTER','OHIO-OVERLOAD','SKILL-ISSUE-STORM','HATER-HAGEL','VIBE-CHECK'],
    en:['RATIO STORM','CRINGE CASCADE','SIGMA SALVO','NPC SWARM','RIZZ ROCKETS','GIGA STORM','OHIO OVERLOAD','SKILL-ISSUE STORM','HATER HAIL','VIBE CHECK'],
    fr:['TEMPÊTE RATIO','CASCADE CRINGE','SALVE SIGMA','ESSAIM NPC','ROQUETTES RIZZ','ORAGE GIGA','OVERLOAD OHIO','TEMPÊTE SKILL-ISSUE','GRÊLE DE HATERS','VIBE CHECK']
  };
  const MEGAKINDS=['ringstorm','spiralhell','aimedstorm','meteorgate','lasercage'];
  const BPALS=[['#ff2e88','#19f0ff','#ffe600'],['#2effc0','#19f0ff','#ff2e88'],['#c45bff','#ff2e88','#19f0ff'],['#ff9a2e','#ffe600','#ff2e88'],['#19f0ff','#2effc0','#ffe600'],['#ff2e6e','#ffd000','#19f0ff'],['#7cff2e','#19f0ff','#ff2e88']];
  function genBossSprite(R,tier){
    const gw=4+tier+((R()*3)|0), gh=4+tier+((R()*3)|0), cp=6+((R()*3)|0), pal=BPALS[(R()*BPALS.length)|0];
    const pad=(tier+4)*cp, cols=gw*2+1, rows=gh*2+1, cw=cols*cp+pad*2, ch=rows*cp+pad*2, ox=pad+gw*cp, oy=pad+gh*cp;
    const grid=new Map(), setc=(x,y,c)=>{ grid.set(x+','+y,c); grid.set((-x)+','+y,c); };
    const h0=R()*6.28,h1=R()*6.28,a3=0.12+R()*0.14,a5=0.05+R()*0.12,squash=0.8+R()*0.5;
    for(let y=-gh;y<=gh;y++) for(let x=0;x<=gw;x++){ const nx=x/gw, ny=(y/gh)/squash, ang=Math.atan2(ny,nx+1e-4);
      if(Math.hypot(nx,ny)<=0.74+a3*Math.sin(ang*3+h0)+a5*Math.sin(ang*5+h1)) setc(x,y,pal[0]); }
    if(R()<0.85){ const py=((gh*0.15+R()*gh*0.4)|0), pw=1+((R()*gw*0.55)|0), ph=1+((R()*2)|0);
      for(let y=py;y<=py+ph;y++) for(let x=0;x<=pw;x++) if(grid.has(x+','+y)) setc(x,y,pal[1]); }
    const horns=R()<0.6?1+((R()*2)|0):0;
    if(horns){ const hx=gw-((R()*2)|0); for(let k=0;k<=tier+1;k++) setc(hx-k,-gh-1-k,pal[2]); }
    if(tier>=3){ for(let y=-gh;y<=gh;y+=2){ if(grid.has(gw+','+y)) setc(gw+1,y,pal[2]); } } // Seitenstacheln
    // backen (Farbe + Weiß-Maske für Trefferblitz)
    const cv=document.createElement('canvas'); cv.width=cw; cv.height=ch; const cx2=cv.getContext('2d');
    const wv=document.createElement('canvas'); wv.width=cw; wv.height=ch; const wx=wv.getContext('2d');
    grid.forEach((c,k)=>{ const p=k.split(','), gx=+p[0], gy=+p[1], px=ox+gx*cp, py=oy+gy*cp;
      cx2.fillStyle=c; cx2.fillRect(px-cp/2,py-cp/2,cp-1,cp-1); wx.fillStyle='#fff'; wx.fillRect(px-cp/2,py-cp/2,cp-1,cp-1); });
    // dynamische Teile (in px relativ zur Mitte)
    const nEyes=[1,2,2,2,3][(R()*5)|0], eyes=[], es=cp*(1.3+R()*1.1), eyY=-((gh*0.25)|0)*cp;
    if(nEyes===1) eyes.push({ox:0,oy:eyY,s:es*1.3,ph:R()*6.28});
    else { const exx=((gw*0.42)|0)*cp; eyes.push({ox:-exx,oy:eyY,s:es,ph:R()*6.28},{ox:exx,oy:eyY,s:es,ph:R()*6.28}); if(nEyes===3) eyes.push({ox:0,oy:eyY-es,s:es*0.8,ph:R()*6.28}); }
    const mouths=['grin','fangs','o','teeth'], mouth={type:mouths[(R()*4)|0], oy:((gh*0.46)|0)*cp, w:gw*cp*(0.6+R()*0.3)};
    const nT=Math.min(5,((R()*(tier+1))|0)+ (R()<0.5?1:0)), tents=[];
    for(let i=0;i<nT;i++) tents.push({ox:((-gw*0.7+R()*gw*1.4)|0)*cp, len:2+((R()*tier)|0), ph:R()*6.28, col:pal[(R()*3)|0]});
    const nA=R()<0.7?1+((R()*2)|0):0, ants=[];
    for(let i=0;i<nA;i++) ants.push({ox:((i===0?-1:1)*(gw*0.3)|0)*cp, ph:R()*6.28, col:pal[2]});
    const brows=R()<0.55, lights=[]; const bodyKeys=[...grid.keys()];
    for(let i=0;i<2+((R()*3)|0);i++){ const k=bodyKeys[(R()*bodyKeys.length)|0].split(','); lights.push({ox:(+k[0])*cp,oy:(+k[1])*cp,ph:R()*6.28}); }
    return {cv,white:wv,ox,oy,pal,rad:(gw+0.6)*cp,eyes,mouth,tents,ants,brows,lights,cp};
  }
  function genName(R){ const pool=MEMENAMES[lang]||MEMENAMES.en; return pool[(R()*pool.length)|0]; }
  function startMegaBoss(final){ bossActive=true;
    const tier=final?7:Math.min(6,Math.max(1,Math.floor(bossNumber/2)));
    const R=makeRng(((daily?dailySeed():(Math.random()*1e9))|0)^Math.imul(bossNumber,2654435761));
    const sp=genBossSprite(R,tier);
    const moves=['orbit','fig8','sway','bob'], atks=['radial','aimed','spiral','wall','cross'];
    boss={sp, final:!!final, enraged:false, name:final?('FINALE: '+genName(R)):genName(R),
      move:moves[(R()*moves.length)|0], attack:atks[(R()*atks.length)|0],
      cx:W/2, cy:H*0.24, radX:Math.min(W*0.30,150+tier*8), radY:Math.min(H*0.11,60+tier*8),
      ang:R()*6.28, angVel:rand(0.6,1.0)*(R()<.5?1:-1)*(final?1.15:1), r:sp.rad,
      maxHp:Math.max(40,Math.round(Math.pow(Math.max(0.5,bossDps()),0.90)*(13+bossNumber*1.0)*(final?2.0:1)*diffHp*(BAL.enemyHp||1))), hp:0, t:0,   // bossDps^0.90 (näher an linear): Bosse schmelzen nicht mehr, TTK bleibt fordernd; BAL.enemyHp greift mit
      limit:final?9999:(22+bossNumber*2),
      hitFlash:0, shootT:1.5, warn:0, telegraph:false, fireGap:Math.max(0.9,2.5-bossNumber*0.1-Math.min(0.7,pwrSurv()*0.022)),
      dead:false, deathT:0, x:W/2, y:H*0.24, blink:0,
      mega:MEGAKINDS[(R()*MEGAKINDS.length)|0], megaName:(MEGANAMES[lang]||MEGANAMES.en)[(R()*(MEGANAMES[lang]||MEGANAMES.en).length)|0],   // prozedurale Signatur-Mega-Attacke pro Boss
      megaSeed:{rot:(R()<0.5?1:-1), gap:R(), arms:2+((R()*3)|0)}, megaT:rand(4.5,6.5), megaPhase:null};
    boss.hp=boss.maxHp; ebullets=[]; lastBossName=boss.name;
    bossIntroT=1.8; effects.slowmo=Math.max(effects.slowmo,0.9);   // cineastischer VS-Auftritt + kurze Zeitlupe
    shake=final?20:14; sfxBoss(); sfxWarn(); vibe([60,40,60,40,90]); }
  function eb(x,y,vx,vy){ return {x,y,vx,vy,r:7}; }
  function bossVolley(B){ sfxFire(); shake=Math.max(shake,5); vibe(15);
    const xs=Math.min(5,Math.floor(pwrSurv()*0.28)), spd=(135+bossNumber*7)*(1+Math.min(0.28,pwrSurv()*0.01));
    const tier=Math.min(6,Math.max(1,Math.floor(bossNumber/2)));
    const a0=Math.atan2(player.y-B.y,player.x-B.x);
    if(B.attack==='radial'){ const n=8+tier*2+xs; for(let i=0;i<n;i++){ const a=B.t*0.5+i*6.28/n; ebullets.push(eb(B.x,B.y,Math.cos(a)*spd,Math.sin(a)*spd)); } }
    else if(B.attack==='aimed'){ const n=2+tier+Math.floor(xs/2); for(let i=0;i<n;i++){ const a=a0+(i-(n-1)/2)*0.2; ebullets.push(eb(B.x,B.y,Math.cos(a)*spd*1.25,Math.sin(a)*spd*1.25)); } }
    else if(B.attack==='spiral'){ const n=4+tier+Math.floor(xs/2); for(let i=0;i<n;i++){ const a=B.t*2.2+i*6.28/n; ebullets.push(eb(B.x,B.y,Math.cos(a)*spd,Math.sin(a)*spd)); } }
    else if(B.attack==='wall'){ const gap=rand(0.25,0.75), gw2=Math.max(0.06,0.12-xs*0.008); for(let i=0;i<=10;i++){ if(Math.abs(i/10-gap)<gw2) continue; ebullets.push(eb(W*i/10,B.y,0,spd*0.9)); } }
    else { const n=8+xs; for(let i=0;i<n;i++){ const a=i*6.28/n; ebullets.push(eb(B.x,B.y,Math.cos(a)*spd,Math.sin(a)*spd)); } } }
  // ---- Mega-Attacke: prozedurale, getelegrafierte Signatur-Salve (skaliert mit Boss-Nr.); etwas größere Kugeln ----
  function meb(x,y,vx,vy,r){ return {x,y,vx,vy,r:r||8}; }
  function megaTier(B){ return Math.min(7,Math.max(1,Math.floor(bossNumber/2)+(B&&B.final?2:0))); }
  function megaCfg(B){ switch(B.mega){
    case 'spiralhell': return {dur:2.6,interval:0.08};
    case 'aimedstorm': return {dur:2.1,interval:0.5};
    case 'meteorgate': return {dur:2.4,interval:0.22};
    case 'lasercage':  return {dur:1.5,interval:99,instant:true};
    default:           return {dur:2.3,interval:0.52}; } }   // ringstorm
  function megaSalvo(B){ if(ebullets.length>150) return; const tier=megaTier(B), sd=B.megaSeed||{}, spd=120+bossNumber*6;
    if(B.mega==='spiralhell'){ const arms=sd.arms||3; for(let i=0;i<arms;i++){ const a=B.t*3.2*(sd.rot||1)+i*6.28/arms; ebullets.push(meb(B.x,B.y,Math.cos(a)*(spd+22),Math.sin(a)*(spd+22))); } }
    else if(B.mega==='aimedstorm'){ const a0=Math.atan2(player.y-B.y,player.x-B.x), n=5+tier; for(let i=0;i<n;i++){ const a=a0+(i-(n-1)/2)*0.16; ebullets.push(meb(B.x,B.y,Math.cos(a)*spd*1.5,Math.sin(a)*spd*1.5)); } sfxFire(); }
    else if(B.mega==='meteorgate'){ const cols=11; B._g=(B._g==null?(sd.gap||0.5):B._g+0.03*(sd.rot||1)); const g=((B._g%1)+1)%1; for(let i=0;i<cols;i++){ if(Math.abs(i/(cols-1)-g)<0.13) continue; ebullets.push(meb(W*i/(cols-1),-18,0,spd*1.1)); } }
    else { const n=14+tier*2; B._ring=(B._ring||0)+1; const gap=(sd.gap||0)*6.28+B._ring*0.5*(sd.rot||1);   // ringstorm: rotierende Lücke
      for(let i=0;i<n;i++){ const a=i*6.28/n, d=Math.abs(((a-gap+Math.PI)%6.28+6.28)%6.28-Math.PI); if(d<0.55) continue; ebullets.push(meb(B.x,B.y,Math.cos(a)*spd,Math.sin(a)*spd)); } }
    shake=Math.max(shake,4); }
  function spawnLaserCage(B){ const cnt=Math.min(7,4+Math.floor(bossNumber/3));   // selbst-telegrafierende Laser (eine sichere Gasse bleibt offen)
    for(let i=0;i<cnt;i++){ const orient=(i%2===0)?'h':'v'; const pos=orient==='v'?(W*(0.14+0.72*i/cnt)):(H*(0.2+0.66*i/cnt)); lasers.push({orient,pos,thick:rand(46,64),state:'warn',t:0,warnDur:0.9,fireDur:0.5}); }
    sfxWarn(); }
  function startBossDeath(){ const B=boss; B.dead=true; B.scale=1; ebullets=[];
    effects.slowmo=Math.max(effects.slowmo,1.0); shake=22; vibe([120,60,160]); sfxWin();
    // Zufälliger spektakulärer Abgang (Final-Boss nie als simpler Ballon-Pop)
    B.style=pick(B.final?['bloat','meltdown','implode']:['bloat','balloon','meltdown','implode']);
    if(B.style==='balloon'){            // zerplatzt sofort in rote/weiße Fetzen + Splatter
      B.deathT=0.7;
      spawnGibs(B.x,B.y,44,['#ff2e88','#ff3b3b','#ffffff','#ffd0e0','#ff6a9a'],380,560);
      spawnParticles(B.x,B.y,'#ff3b3b',42,360); spawnParticles(B.x,B.y,'#ffffff',26,300);
      flash=0.6; flashColor='#ff3b6b'; sfxBalloonPop(); }
    else if(B.style==='bloat'){         // pumpt sich auf → Explosion am Ende
      B.deathT=1.4; flash=0.3; flashColor='#ffe600'; sfxBloat(); }
    else if(B.style==='meltdown'){      // strobt & zerfällt elektrisch
      B.deathT=1.5; flash=0.4; flashColor='#19f0ff'; sfxMeltdown(); }
    else {                              // implode: schrumpft in einen Punkt → Schockwelle
      B.deathT=1.1; flash=0.25; flashColor='#c45bff'; sfxImplode(); } }
  function defeatMegaBoss(){ const B=boss, wasFinal=B&&B.final, st=B&&B.style, bx=B?B.x:W/2, by=B?B.y:H*0.28;
    const bonus=(wasFinal?600:160)*multiplier*bossNumber, chips=Math.round(((wasFinal?120:20)+Math.min(bossNumber,15)*8)*diffChip);   // Boss-Chips gedeckelt + ×diffChip
    addScore(bonus); awardCoins(chips,bx,by-44,true); saveMeta();   // Boss-Sieg = großer Gold-Pop
    // ---- Stil-Finale am Boss-Ort ----
    if(st==='bloat'){ flash=0.85; flashColor='#ffe600'; shake=28; sfxBoom();
      pixelBurst(bx,by,'#ffe600',30); pixelBurst(bx,by,'#ff9a2e',22); spawnParticles(bx,by,'#ffffff',40,440);
      if(novas.length<18) novas.push({x:bx,y:by,r0:20,rMax:Math.max(W,H)*0.6,t:0,life:0.5,col:'#ffe600'}); }
    else if(st==='implode'){ flash=0.9; flashColor='#ffffff'; shake=22; sfxBoom();
      pixelBurst(bx,by,'#ffffff',26); pixelBurst(bx,by,'#c45bff',18);
      if(novas.length<18) novas.push({x:bx,y:by,r0:6,rMax:Math.max(W,H)*0.7,t:0,life:0.45,col:'#c45bff'}); }
    else if(st==='meltdown'){ flash=0.6; flashColor='#19f0ff'; shake=18; sfxBoom();
      pixelBurst(bx,by,'#19f0ff',26); spawnGibs(bx,by,18,['#19f0ff','#caffff','#ffffff'],320,520); }
    else { spawnParticles(bx,by,'#ff3b3b',16,300); spawnParticles(bx,by,'#ffffff',10,260); }   // balloon: schon zerfetzt → kleiner Nachschlag
    vibe([20,30,40]); runBosses++; unlockAch('mega');
    grantBossSP(bx,by-92);   // Boss-Drop: 1–3 Skillpunkte (meist 2)
    dropLoot(bx,by-40,'boss',wasFinal); if(wasFinal) dropLoot(bx+40,by-40,'boss',true);   // garantierte Boss-Beute (Finale: doppelt)
    for(let i=0;i<mods.shieldPerBoss;i++) shields=Math.min(shields+1,5);
    boss=null; bossActive=false; bossNumber++;
    if(wasFinal) winGame();
    else { floatText(bx,by-66,t('defeated')+' +'+bonus,'#2effc0',18); bossTimer=combatDur(); levelUp(); } }   // Boss tot → Level geschafft
  // Einsammelbarer Skillpunkt-Drop (cyan 💠-Raute) – wie Coins sichtbar, per Hineinfliegen aufzusammeln
  function spawnSP(x,y){ if(!sps) sps=[]; if(sps.length>40) return;
    sps.push({x:Math.max(20,Math.min(W-20,x+rand(-8,8))), y:Math.max(-20,y+rand(-6,6)), r:13, vy:40, pulse:Math.random()*6.28, rot:Math.random()*6.28}); }
  function collectSP(s){ skillPts++; runSPgain++; saveSP(); floatText(s.x,s.y-20,'💠 +1','#19f0ff',22); sfxPow();
    spawnParticles(s.x,s.y,'#19f0ff',16,240); flash=Math.min(0.5,(flash||0)+0.18); flashColor='#19f0ff'; vibe([12,16]); beep(1600,0.06,'square',0.12,300); updateAllBalances();
    coach('sp'); }   // erster Skillpunkt: Coach zeigt die Werkstatt
  // Boss-Drop: 0–3 Skillpunkte, gewichtet – meist 0/1 (1 ~50%), 2 sehr selten, 3 sehr sehr selten
  function grantBossSP(x,y){ const r=Math.random(); let n=r<0.41?0:(r<0.91?1:(r<0.985?2:3));
    if(runBosses<=2 && n<1) n=1;   // verlässlicher Progress-Einstieg: die ersten beiden Bosse geben sicher mind. 1 Skillpunkt
    if(n<=0) return;   // kein Drop
    if(state!==S.PLAY){ skillPts+=n; saveSP(); updateAllBalances(); return; }   // außerhalb des Spiels: direkt gutschreiben (kein Feld)
    for(let i=0;i<n;i++) spawnSP(x+rand(-46,46), y+rand(-12,34));
    sfxPow(); flash=Math.min(0.6,(flash||0)+0.22); flashColor='#19f0ff';
    banner={text:'💠 '+t('skillPts')+' ×'+n,sub:t('spDrop'),t:2.2,color:'#19f0ff'}; }
  // Seltener Zufalls-Drop bei Gegner-Kill: ein einsammelbarer Skillpunkt
  function grantRandomSP(x,y){ if(state!==S.PLAY){ skillPts++; saveSP(); updateAllBalances(); return; } spawnSP(x,y); }
  function winGame(){ endless=true; madness=0; wonThisRun=true; meta.won=(meta.won||0)+1; saveMeta(); unlockAch('won');
    banner={text:t('beaten'),sub:t('beatenSub'),t:4.5,color:'#ffe600'};
    flash=0.85; flashColor='#ffe600'; shake=26; effects.slowmo=Math.max(effects.slowmo,1.4);
    for(let i=0;i<6;i++) pixelBurst(rand(W*0.2,W*0.8),rand(H*0.18,H*0.6),pick(['#ffe600','#ff2e88','#19f0ff','#2effc0']),10);
    sfxWin(); setTimeout(()=>{sfxWin();},220); setTimeout(()=>{sfxRiser();},520); vibe([120,40,120,40,200,60,220]);
    setTimeout(()=>{ if(state===S.PLAY) banner={text:t('madness'),sub:t('madnessSub'),t:3,color:'#ff2e88'}; },2700);
    bossTimer=(mode==='hardcore')?9:12; }
  function bossFlee(){ ebullets=[];
    if(boss && !boss.fleeing){   // Mega-Boss: lachend, wachsend davonfliegen (statt sofort weg)
      boss.fleeing=true; boss.fleeT=1.9; boss.scale=1; boss.laughT=0; boss.telegraph=false;
      banner={text:t('escaped'),sub:t('escapedSub'),t:2.4,color:'#9a86c9'};
      sfxLaugh(); flash=0.3; flashColor='#c45bff'; shake=10; vibe([30,40,30,40,60]); return; }
    endBossFlee(); }
  function endBossFlee(){ restartLevel(); }   // Boss entkommen → Level NICHT geschafft → von vorne (kein bossNumber++)
  function updateMegaBoss(dt,ts){ const B=boss;
    if(B.dead){ B.deathT-=dt; const st=B.style;
      if(st==='bloat'){ B.scale=(B.scale||1)+dt*1.05; const j=B.scale*1.4; B.x+=rand(-j,j); B.y+=rand(-j,j);   // pumpt sich auf & bebt
        if(Math.random()<0.5) pixelBurst(B.x+rand(-B.r,B.r)*B.scale,B.y+rand(-B.r,B.r)*B.scale,pick(['#ffe600','#ff9a2e','#ffffff']),2); }
      else if(st==='balloon'){ B.scale=Math.max(0.04,(B.scale||1)-dt*3.2); B.x+=Math.sin(B.deathT*70)*5; B.y+=Math.cos(B.deathT*58)*4; }   // entleert sich zischend
      else if(st==='meltdown'){ B.flick=Math.random()<0.5; B.x+=rand(-3,3); B.y+=rand(-2,2);                  // strobt & knistert
        if(Math.random()<0.55 && zaps.length<26){ const a=Math.random()*6.28; zaps.push({pts:[[B.x,B.y],[B.x+Math.cos(a)*B.r,B.y+Math.sin(a)*B.r],[B.x+Math.cos(a)*B.r*1.7+rand(-20,20),B.y+Math.sin(a)*B.r*1.7+rand(-20,20)]],t:0.12,life:0.12}); }
        if(Math.random()<0.4) pixelBurst(B.x+rand(-B.r,B.r),B.y+rand(-B.r,B.r),pick(['#19f0ff','#caffff','#ffffff']),1); }
      else { B.scale=Math.max(0,(B.scale||1)-dt*0.92);                                                        // implodiert: saugt Funken nach innen
        if(Math.random()<0.8){ const a=Math.random()*6.28, rr=B.r*2.4; emitP(B.x+Math.cos(a)*rr,B.y+Math.sin(a)*rr,-Math.cos(a)*300,-Math.sin(a)*300,0.05,pick(['#c45bff','#ff2e88','#caffff']),rand(2,4)); } }
      if(B.deathT<=0) defeatMegaBoss(); return; }
    if(B.fleeing){ B.fleeT-=dt; B.t+=dt*3.4;                       // lacht & wackelt schneller
      B.scale=Math.min(2.4,(B.scale||1)+dt*0.95);                  // wird größer
      B.y-=dt*(70+(1.9-B.fleeT)*300);                             // fliegt hoch (beschleunigt)
      B.x+=Math.sin(B.t*1.4)*3.2;                                 // schlenkert
      B.laughT-=dt; if(B.laughT<=0){ sfxLaugh(); B.laughT=0.64; }
      if(Math.random()<0.4) pixelBurst(B.x+rand(-B.r,B.r),B.y+rand(-B.r,B.r),pick(['#ffe600','#c45bff','#19f0ff','#2effc0']),2);
      if(B.fleeT<=0 || B.y < -B.r*2.6*(B.scale||1)) endBossFlee();
      return; }
    if(B.stun>0){ B.stun-=dt; if(B.hitFlash>0) B.hitFlash-=dt; B.blink=0.16; B.x+=rand(-2,2); B.y+=rand(-1,1);   // betäubt: bewegt/feuert nicht, Mega & Flucht-Timer eingefroren (telegrafiert via draw)
      if(Math.random()<0.5) pixelBurst(B.x+rand(-B.r,B.r),B.y+rand(-B.r,B.r),'#ffe600',1); return; }
    B.t+=dt*ts; if(B.hitFlash>0) B.hitFlash-=dt; if(B.blink>0) B.blink-=dt;
    if(B.t>B.limit){ bossFlee(); return; }      // Timeout: entkommt mit der Beute (kein Soft-Lock)
    if(B.blink<=0 && Math.random()<0.012) B.blink=0.16;   // gelegentliches Blinzeln
    if(B.final && !B.enraged && B.hp<=B.maxHp*0.5){ B.enraged=true; B.angVel*=1.6; B.fireGap*=0.55; B.attack='spiral';
      banner={text:t('enrage'),sub:t('enrageSub'),t:2,color:'#ff2e88'}; flash=0.5; flashColor='#ff2e88'; shake=18; sfxWarn(); vibe([40,30,40,30,60]); }
    B.ang+=B.angVel*dt*ts;
    if(B.move==='fig8'){ B.x=B.cx+Math.cos(B.ang)*B.radX; B.y=B.cy+Math.sin(B.ang*2)*B.radY; }
    else if(B.move==='sway'){ B.x=B.cx+Math.sin(B.ang)*B.radX; B.y=B.cy+Math.sin(B.ang*0.5)*B.radY*0.5; }
    else if(B.move==='bob'){ B.x=B.cx+Math.sin(B.t*1.2)*B.radX*0.85; B.y=B.cy+Math.abs(Math.sin(B.t*1.7))*B.radY; }
    else { B.x=B.cx+Math.cos(B.ang)*B.radX; B.y=B.cy+Math.sin(B.ang)*B.radY; }
    // ---- Mega-Attacke: prozedurale Signatur-Salve mit Telegraph (pausiert den normalen Beschuss) ----
    if(!B.megaPhase){ B.megaT-=dt*ts;
      if(B.megaT<=0 && !B.telegraph){ B.megaPhase='tele'; B.megaWarn=1.15;
        banner={text:'⚠ '+(B.megaName||'MEGA'),sub:t('megaAtk'),t:1.7,color:'#ff2e6e'}; sfxWarn(); shake=Math.max(shake,13); flash=Math.max(flash||0,0.3); flashColor='#ff2e6e'; vibe([30,40,30,40,70]); } }
    else if(B.megaPhase==='tele'){ B.megaWarn-=dt*ts;
      if(B.megaWarn<=0){ B.megaPhase='fire'; const c=megaCfg(B); B.megaDur=c.dur; B.megaTick=0; B._ring=0; B._g=null;
        if(c.instant && B.mega==='lasercage') spawnLaserCage(B); } }
    else { const c=megaCfg(B); if(!c.instant){ B.megaTick-=dt; if(B.megaTick<=0){ megaSalvo(B); B.megaTick=c.interval; } }
      B.megaDur-=dt; if(B.megaDur<=0){ B.megaPhase=null; B.megaT=rand(8,11)/(B.enraged?1.5:1); } }
    // ---- normaler Beschuss (während einer Mega-Attacke ausgesetzt) ----
    if(!B.megaPhase){ if(!B.telegraph){ B.shootT-=dt*ts; if(B.shootT<=0){ B.telegraph=true; B.warn=0.55; sfxWarn(); } }
      else { B.warn-=dt*ts; if(B.warn<=0){ bossVolley(B); B.telegraph=false; B.shootT=B.fireGap; } } } }
  function endBoss(){ bossActive=false; const wasFinal=laserFinal; laserFinal=false; bossTimer=combatDur();
    const bonus=(wasFinal?500:100)*multiplier*bossNumber; addScore(bonus);
    spawnParticles(W/2,H*0.4,'#ffe600',wasFinal?60:36,300);
    flash=0.5; flashColor='#ffe600'; sfxWin(); vibe([20,30,40]);
    for(let i=0;i<mods.shieldPerBoss;i++) shields=Math.min(shields+1,5);
    grantBossSP(W/2,H*0.32);   // Laser-Boss-Drop: 1–3 Skillpunkte
    dropLoot(W/2,H*0.32,'boss',wasFinal); if(wasFinal) dropLoot(W/2+40,H*0.32,'boss',true);   // garantierte Boss-Beute (Finale: doppelt)
    bossNumber++; runBosses++;
    if(wasFinal){ const chips=Math.round((120+Math.min(bossNumber,15)*8)*diffChip); meta.chips=(meta.chips||0)+chips; saveMeta(); updateMenuChips(); winGame(); }
    else { floatText(W/2,H*0.4,t('survived')+' +'+bonus,'#2effc0',18); levelUp(); } }   // Welle überstanden → Level geschafft
  function spawnLaserWave(){ const mixed=bossNumber>=3, vert=(bossNumber%2===1);
    const room=Math.max(0,5-lasers.length);   // gleichzeitige Wände hart begrenzen → Bild bleibt lesbar (kein Linien-Wirrwarr im Lategame)
    const count=Math.min(room,Math.min(6,1+Math.floor(bossNumber/2)+Math.min(2,Math.floor(pwrSurv()*0.14))));
    if(count<=0){ sfxWarn(); return; }
    const warn=Math.max(0.55,1-bossNumber*0.04-Math.min(0.2,pwrSurv()*0.01));   // Mindest-Warnzeit angehoben (0.55s) → fair lesbar
    for(let i=0;i<count;i++){ const orient=mixed?(Math.random()<0.5?'v':'h'):(vert?'v':'h');
      const pos=orient==='v'?rand(W*0.1,W*0.9):rand(H*0.15,H*0.9);
      lasers.push({orient,pos,thick:rand(42,64),state:'warn',t:0,warnDur:warn,fireDur:0.45}); }
    sfxWarn(); }

  // ---------- Level / Upgrade flow ----------
  const UNLOCK={2:{key:'sine',name:'Wellenflug'},3:{key:'drift',name:'Gleiter'},4:{key:'orbit',name:'Kreisel'},5:{key:'zigzag',name:'Irrläufer'},6:{key:'pendulum',name:'Pendler'}};
  function levelUp(){ level++; levelTimer=levelDuration;
    const u=UNLOCK[level]; let sub=t('faster');
    if(u){ unlocked.push(u.key); sub=t('newForm')+formName(u.key); }
    if(SONGS.length>1){ do{ pendingSong=Math.floor(Math.random()*SONGS.length); }while(pendingSong===curSong); }   // neuen Song nur VORMERKEN – Einblendung erfolgt schleichend an ruhiger Stelle (kein Riser/Ansage)
    banner={text:t('lvl')+' '+level,sub,t:2.6,color:'#19f0ff'}; sfxLevel(); vibe([20,25,20]);
    flash=0.4; flashColor='#19f0ff';
    if(level===3) setTimeout(()=>{ if(state===S.PLAY) lore('lvl3'); },2800);
    else if(level===6) setTimeout(()=>{ if(state===S.PLAY) lore('lvl6'); },2800);
    else if(level===10) setTimeout(()=>{ if(state===S.PLAY) lore('lvl10'); },2800);
  }
  // Passiv-Upgrade-Angebote für die Level-Up-Karten. Waffen/Skills laufen jetzt über den klickbaren Baum (Skillpunkte).
  function offerPool(){ const out=[];
    for(const u of UPGRADES){ if(u.curse) continue; if((upgradeCounts[u.id]||0)>=u.max) continue;   // pickup-Upgrades (Radar, Magnet, Combo …) jetzt als kuratierte Level-Up-Karte statt Zufalls-Gem
      if(u.wpass && (!opt.guns||ownedCount()===0)) continue;
      if(u.jump && mode==='zen') continue;   // Sprung-Upgrades nur wo der Sprung existiert
      out.push({kind:'pass',u}); }
    return out; }
  // Build-Linien: Archetyp-Tags + sanfte Gewichtung → eine GEWOLLTE Linie entsteht, ohne den Roguelite-Zufall zu töten.
  const BUILD_TAGS={jumpcd:'jump',jumpdouble:'jump',jumpstomp:'jump',jumpphase:'jump',jumpshock:'jump',jumpfrost:'jump',blaster:'gun',twin:'gun',power:'gun',pierce:'gun',crit:'gun',critdmg:'gun',amp:'gun',tempo:'gun',missile:'control',flame:'control',frost:'control',chain:'control',nova:'control'};
  const TAGICO={jump:'🦅',gun:'🔫',control:'❄️'};
  function buildLean(){ const c={}; for(const id in upgradeCounts){ const tg=BUILD_TAGS[id]; if(tg) c[tg]=(c[tg]||0)+upgradeCounts[id]; } let best=null,bv=0; for(const k in c){ if(c[k]>bv){ bv=c[k]; best=k; } } return bv>=2?best:null; }   // erst ab 2 Picks zeichnet sich eine Linie ab
  function offerWeight(o){ if(o.kind!=='pass') return 1; const tg=BUILD_TAGS[o.u.id];
    if(tg&&tg===buildLean()) return 2.4;                                  // passende Build-Linie ~2.4× wahrscheinlicher (sanft, nichts ausgeschlossen)
    if(o.u.jump && (upgradeCounts[o.u.id]||0)===0) return 1.8;            // noch nicht geholte Sprung-Upgrades bleiben gut auffindbar – sonst verdrängt eine Waffen-/Kontroll-Linie den Doppelsprung praktisch komplett
    return 1; }
  // Gibt es überhaupt einen freischaltbaren Knoten/eine holbare Waffe? (unabhängig von Punkten)
  // Mit Waffen ist ein Punkt IMMER einsetzbar (Fork/Waffe ODER universelles „Verstärken") → keine toten Punkte
  function skillSpendable(){ return !!opt.guns; }
  function spendOvercharge(){ if(skillPts<=0) return; skillPts--; mods.oc=(mods.oc||0)+1; recalcArsenal(); sfxPow(); vibe(15);
    banner={text:t('overchargeName').toUpperCase(),sub:'+'+(6*mods.oc)+'% '+t('damage'),t:1.4,color:'#19f0ff'}; saveLoadout(); renderArsenalView(); }
  // Hat man einen Punkt UND etwas zum Ausgeben?
  function hasSkillSpend(){ return skillPts>0 && skillSpendable(); }
  // Live-Chips: aus Score+Near abgeleitetes Run-Guthaben (ohne Boss-Live-Chips, ohne Sieg-Bonus → die laufen separat)
  function scoreChips(){ const s=score||0, scChips=s<=25000?s/46:25000/46+(s-25000)/140;   // Score-Trickle leicht angehoben (mehr Coin-Einkommen) – Hauptquelle sind jetzt die Münz-Pickups
    return Math.max(0,Math.round((scChips+(nearCount||0)*1.0)*chipMult()*diffChip)); }
  let coinSaveAcc=0;
  function accrueChips(force){ if(force===undefined) force=true;        // stiller Score-Trickle (Ökonomie-Backbone)
    const tgt=scoreChips();
    if(tgt>runChipsPaid){ meta.chips=(meta.chips||0)+(tgt-runChipsPaid); coinSaveAcc+=(tgt-runChipsPaid); runChipsPaid=tgt; updateMenuChips(); }
    if(force||coinSaveAcc>=30){ saveMeta(); coinSaveAcc=0; } }
  // Sichtbare Coin-Belohnung an Ort X/Y (Dopamin: Gold-Pop). Quelle klar erkennbar (Orb/Combo/Boss).
  function awardCoins(n,x,y,big){ n=Math.max(0,Math.round(n)); if(!n) return; coach('coin');
    meta.chips=(meta.chips||0)+n; runChipsEarned+=n; coinSaveAcc+=n; updateMenuChips();
    if(x!=null) floatText(x,y,'+🪙'+n,'#ffd23f',big?22:16);
    if(coinSaveAcc>=30){ saveMeta(); coinSaveAcc=0; } }
  function openUpgrade(armed){ accrueChips(); updateRunShopBtns();   // Live-Chips gutschreiben; Skillpunkte sind persistent (Boss-/Zufalls-Drops, kaufbar) → im Hangar einsetzbar
    state=S.UPGRADE; sfxUpgrade(); vibe([30,20,30]);
    const utitleEl=document.querySelector('#upgrade .utitle');
    if(utitleEl) utitleEl.textContent=armed?t('arsenal'):t('chooseUp');
    upgradeSub.textContent=(armed?(t('armUp')+level):(t('level')+' '+level+' · '+t('points')+' '+Math.round(score)))
      + ((hasSkillSpend())?(' · 💠'+skillPts+' '+t('skillPts')+' → 🎒'):'');
    const pool=offerPool(); const wp=pool.filter(o=>o.kind!=='pass'), pp=pool.filter(o=>o.kind==='pass');
    let chosen=[]; const take=arr=>{ if(!arr.length) return; let tot=0; for(const o of arr) tot+=offerWeight(o); let r=Math.random()*tot, idx=arr.length-1; for(let k=0;k<arr.length;k++){ r-=offerWeight(arr[k]); if(r<=0){ idx=k; break; } } chosen.push(arr.splice(idx,1)[0]); };   // gewichtete Auswahl (Build-Linie bevorzugt)
    if(armed){ while(chosen.length<2&&wp.length) take(wp); while(chosen.length<3&&pp.length) take(pp); while(chosen.length<3&&wp.length) take(wp); }
    else { while(chosen.length<3){ if((chosen.length<2||!pp.length)&&wp.length) take(wp); else if(pp.length) take(pp); else break; } }
    while(chosen.length<3 && (wp.length||pp.length)) take(wp.length?wp:pp);
    if(!chosen.length){ closeUpgrade(); return; }   // alles maxed & Slots voll → einfach weiter
    for(let i=chosen.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [chosen[i],chosen[j]]=[chosen[j],chosen[i]]; }
    upgradeCards.innerHTML='';
    chosen.forEach(o=>{ const card=document.createElement('div'); let ico,name,desc,tag,cls='ucard';
      if(o.kind==='new'){ ico=WID[o.wid].ico; name=wName(o.wid); desc=wDesc(o.wid); tag='🆕 '+t('newWeapon'); cls+=' weapon wnew'; }
      else if(o.kind==='fork'){ ico=WID[o.wid].ico; name=wName(o.wid)+' · '+pName(o.path); desc=pDesc(o.path); tag='⌥ '+t('path'); cls+=' weapon wfork'; }
      else { const u=o.u, lvl=(upgradeCounts[u.id]||0); ico=u.ico; name=uName(u.id); desc=uDesc(u.id); tag=(lvl>0?(t('level')+' '+lvl+'/'+u.max):('0/'+u.max))+(BUILD_TAGS[u.id]?(' '+TAGICO[BUILD_TAGS[u.id]]):''); if(u.wpass) cls+=' weapon'; }
      card.className=cls; card.innerHTML=`<div class="ico">${ico}</div><h4>${name}</h4><p>${desc}</p><div class="stack">${tag}</div>`;
      card.addEventListener('click',()=>chooseOffer(o)); upgradeCards.appendChild(card);
    });
    document.getElementById('upgrade').classList.remove('hidden');
    lore('upgrade');   // Story-Beat erst nach Aufbau des Upgrade-Screens (Rückkehr-State = UPGRADE)
  }
  function closeUpgrade(){ document.getElementById('upgrade').classList.add('hidden');
    upStep=Math.round(upStep*1.55); nextUpgradeAt=score+upStep;
    // kein zweiter Pflicht-Screen mehr: Skillpunkte werden on-demand über Cockpit/Arsenal eingesetzt
    state=S.PLAY; invuln=Math.max(invuln,1.0); lastT=performance.now(); }
  function chooseOffer(o){ const before=Object.assign({},syn); let label='';
    if(o.kind==='new'){ arsenal.w[o.wid]={lvl:1,f1:null,f2:null,f3:null,f4:null}; label=wName(o.wid); coachDyn('w_'+o.wid,'🔫',wName(o.wid),wDesc(o.wid),'#19f0ff'); }   // neue Waffe erklären
    else if(o.kind==='fork'){ const a=arsenal.w[o.wid]; a[o.slot]=o.path; a.lvl++; label=wName(o.wid)+' · '+pName(o.path); coachDyn('f_'+o.path,'🧬',pName(o.path),pDesc(o.path),'#ff7ad9'); }   // Waffen-Pfad erklären
    else { o.u.apply(); upgradeCounts[o.u.id]=(upgradeCounts[o.u.id]||0)+1; label=uName(o.u.id); coachDyn('u_'+o.u.id,o.u.ico||'⬆️',uName(o.u.id),uDesc(o.u.id),'#ffe600'); }   // Upgrade-Karte erklären
    recalcArsenal(); sfxPow(); vibe(15);
    banner={text:label.toUpperCase(),sub:t('activated'),t:1.6,color:'#ffe600'};
    for(const s of SYNERGIES){ if(syn[s.id]&&!before[s.id]){ banner={text:s.ico+' '+synName(s.id)+' · '+t('synUnlocked'),sub:synDesc(s.id),t:2.8,color:'#ff2e88'};
      floatText(player.x,player.y-44,s.ico,'#ff2e88',32); flash=Math.min(0.7,flash+0.3); flashColor='#ff2e88'; coachDyn('syn_'+s.id,s.ico,synName(s.id),synDesc(s.id),'#ff2e88'); } }   // Synergie erklären
    closeUpgrade(); }

  // ---------- Hit ----------
  function hitPlayer(color,cause){
    if(invuln>0) return false;
    runHits++;                           // kassierter Treffer (Telemetrie/Schwierigkeits-Signal)
    if(cause) deathCause=(bossActive?'boss:':'')+cause;   // letzter Treffer = tödlicher → Todesursache fürs Balancing
    director=Math.max(0,director-0.2);   // Director: bei Treffer Druck rausnehmen
    if(shields>0){ shields--; invuln=1.4; flash=0.5; flashColor='#2effc0'; shake=14;
      spawnParticles(player.x,player.y,'#2effc0',22,260); sfxShieldBreak(); vibe([30,40,30]);
      floatText(player.x,player.y-26,t('shieldGone'),'#2effc0',18); return false; }
    if(mode==='zen'){ combo=0; multiplier=1; invuln=0.8; flash=0.5; flashColor='#ff2e88'; shake=12;
      spawnParticles(player.x,player.y,'#ff2e88',16,220); beep(200,0.18,'square',0.3,-80); vibe(40);
      floatText(player.x,player.y-24,t('comboGoneZ'),'#ff2e88',16); flushComboBonus(player.x,player.y); return false; }
    lives--;
    if(lives>0){ invuln=1.6; flash=0.6; flashColor='#ff2e88'; shake=16; combo=0; multiplier=1; flushComboBonus(player.x,player.y);
      spawnParticles(player.x,player.y,'#ff4d6d',26,300); sfxShieldBreak(); beep(220,0.3,'sawtooth',0.4,-120); vibe([70,40,70]);
      floatText(player.x,player.y-28,t('lifeLost'),'#ff4d6d',20); banner={text:lives+t('livesLeft'),sub:'',t:1.3,color:'#ff4d6d'}; coachDyn('life','❤️',t('cefLife'),t('cefLifed'),'#ff4d6d'); return false; }
    if(continueEligible()){ offerContinue(); return true; }   // letzter Tod, aber Weiterleben möglich → Abfrage statt Game Over
    gameOver(); return true;
  }
  // ---------- Weiterleben-Continue: einmal pro Run, Kosten steigen mit der Lauf-Tiefe ----------
  const continueCost=()=> Math.round((80+(level||1)*22)*Math.pow(1.7,runContinues)/10)*10;   // fairer: günstigere Basis + sanftere Steigerung (×1.7 statt ×2) → mit erspielten Münzen bezahlbar, kein Pay-Druck
  function continueEligible(){ return mode!=='zen'; }   // IMMER anbieten (nicht-Zen) – zu wenig Coins? → im Coin-Shop nachkaufen
  function renderContinue(){ const cost=continueCost(), aff=(meta.chips||0)>=cost;
    const sub=document.getElementById('contSub'), cb=document.getElementById('continueBtn');
    const ct=document.getElementById('contTitle'); if(ct) ct.textContent=t('contTitle');
    const gu=document.getElementById('giveupBtn'); if(gu) gu.textContent=t('giveup');
    if(sub) sub.innerHTML=t('contSub')+'<br><span class="contBal">'+t('balance')+' 🪙 '+fmt(meta.chips||0)+'</span>';
    if(cb){ cb.innerHTML=aff?('🪙 '+t('reviveBtn')+' · <b>'+fmt(cost)+'</b>'):('🪙 '+t('reviveBuy')+' · <b>'+fmt(meta.chips||0)+'/'+fmt(cost)+'</b>'); cb.classList.toggle('needcoin',!aff); } }
  function offerContinue(){ pendingContinue=true; state=S.PAUSE;
    renderContinue();
    document.getElementById('hud').classList.add('hidden'); showCockpit(false);
    const sc=document.getElementById('continue'); if(sc) sc.classList.remove('hidden');
    duckMusic(1.8); beep(440,0.1,'square',0.25); vibe([30,60,30]); }
  function doContinue(){ if(!pendingContinue) return; const cost=continueCost();
    if((meta.chips||0)<cost){ openCoinShop(); return; }   // zu wenig Coins → Coin-Shop öffnen (kaufen/einlösen), danach erneut antippen
    meta.chips-=cost; runContinues++; pendingContinue=false; saveMeta();   // nächstes Weiterleben kostet das Doppelte
    document.getElementById('continue').classList.add('hidden');
    lives=1; shields=Math.max(shields,1); invuln=2.6;
    obstacles=[]; lasers=[]; ebullets=[];                                  // Gnadenfrist: Bedrohungen vom Bildschirm wischen
    flash=0.5; flashColor='#2effc0'; shake=14; spawnParticles(player.x,player.y,'#2effc0',32,340);
    banner={text:t('reviveBanner'),sub:'',t:1.6,color:'#2effc0'};
    document.getElementById('hud').classList.remove('hidden'); showCockpit(true);
    updateAllBalances(); updateMenuChips();
    state=S.PLAY; lastT=performance.now(); sfxUpgrade(); vibe([20,40,20]); }
  function declineContinue(){ if(!pendingContinue) return; pendingContinue=false;
    document.getElementById('continue').classList.add('hidden'); gameOver(); }

  // ---------- Sprung-Dash: Schiff antippen → Hüpfer mit kurzer Unverwundbarkeit, vaultet weg von der Gefahr ----------
  function sfxJump(){ try{ beep(300,0.1,'sine',0.28,520); setTimeout(()=>beep(680,0.12,'triangle',0.22,260),70); }catch(e){} }
  function tryJump(){
    if(state!==S.PLAY||mode==='zen'||jumping>0) return;
    inputDirty=true;   // Tap = Interaktion → Passivitäts-Timer zurücksetzen
    if(jumpStock<1){ beep(170,0.06,'square',0.12); return; }   // keine Ladung → kurzes „nope"
    jumpStock--; jumping=mods.jumpDur; invuln=Math.max(invuln,mods.jumpDur+0.2); jumpSeq++; jumpClutch=0; jumpClutchFired=false; runJumps++;
    // Gerichteter Sprung: ans angetippte Ziel (tgt) springen – über alles drüber (unverwundbar). Weiter als die
    // Reichweite? Dann kommt das Schiff bei max. Reichweite auf (entsprechend früher / kurz davor).
    const range=JUMP_RANGE*(mods.jumpVault||1);
    let dx=tgt.x-player.x, dy=tgt.y-player.y, d=Math.hypot(dx,dy);
    let lx,ly; if(d<=range||d<1){ lx=tgt.x; ly=tgt.y; } else { lx=player.x+dx/d*range; ly=player.y+dy/d*range; }
    lx=Math.max(player.r,Math.min(W-player.r,lx)); ly=Math.max(player.r,Math.min(H-player.r,ly));
    jumpFromX=player.x; jumpFromY=player.y; jumpToX=lx; jumpToY=ly;
    tgt.x=lx; tgt.y=ly;   // Landepunkt = Steuerziel: Schiff bleibt nach der Landung dort, Visier zeigt den echten Landepunkt
    shake=Math.max(shake,15); flash=0.3; flashColor='#19f0ff'; spawnParticles(player.x,player.y,'#19f0ff',30,360);
    floatText(player.x,player.y-32,t('jumpTxt'),'#19f0ff',20); sfxJump(); vibe([18,35,18]);
  }
  // Stoß-Landung (Upgrade): beim Aufkommen Schockwelle – stößt Hindernisse weg, beschädigt/zerstört sie UND fegt nahe Gegner-Kugeln weg (Mega-Konter!)
  function jumpStomp(){ const R=JUMP_R*1.35, R2=R*R, dmg=(gunDps()||10)*1.4;
    if(novas.length<18) novas.push({x:player.x,y:player.y,r0:player.r,rMax:R,t:0,life:0.42,col:'#19f0ff'});
    for(let i=obstacles.length-1;i>=0;i--){ const o=obstacles[i], dx=o.cx-player.x,dy=o.cy-player.y, d2=dx*dx+dy*dy; if(d2>=R2) continue;
      const d=Math.sqrt(d2)||1, k=(R-d)/R; o.cx+=dx/d*70*k; o.cy+=dy/d*70*k;   // wegschubsen
      if(o.hp!=null){ o.hp-=dmg*(0.6+k); if(o.hp<=0){ killObstacle(o); obstacles.splice(i,1); } } }
    for(let i=ebullets.length-1;i>=0;i--){ const e=ebullets[i], dx=e.x-player.x,dy=e.y-player.y; if(dx*dx+dy*dy<R2) ebullets.splice(i,1); }   // Kugeln im Radius weggefegt
    shake=Math.max(shake,16); flash=Math.max(flash||0,0.32); flashColor='#19f0ff'; spawnParticles(player.x,player.y,'#19f0ff',26,380); try{ sfxBoom(); }catch(_){ } vibe([20,40,30]); }
  // Landungs-Aufprall (Basis): auf Hindernisse landen → GARANTIERTE Zerstörung; auf Boss → Schaden + Stagger + Katapult in Sicherheit
  function jumpLand(){ invuln=Math.max(invuln,0.6);
    const base=player.r+30; let hit=false, kills=0;
    for(let i=obstacles.length-1;i>=0;i--){ const o=obstacles[i], dx=o.cx-player.x,dy=o.cy-player.y,
        reach=Math.max(base, player.r+Math.max(o.w||0,o.h||0)*0.5+12);   // größenbewusst: alles wegräumen, was den Landepunkt berührt (kein Sofort-Treffer durch große Hindernisse)
        if(dx*dx+dy*dy>=reach*reach) continue;
      o.hitFlash=0.12; killObstacle(o); obstacles.splice(i,1); hit=true; kills++; }   // immer zerstören – kein HP-Check mehr (auch zähe/Elite-Gegner)
    // Stomp-Kill-Belohnung: offensives Springen lohnt sich auch ökonomisch (Bonus-Punkte + Münzen)
    if(kills>0){ addScore(50*kills*Math.max(1,multiplier)); awardCoins((3+kills*3)*chipMult()*diffChip,player.x,player.y-42,true); floatText(player.x,player.y-50,'×'+kills+' 💥','#ffe600',18); }
    if(boss&&!boss.dead&&!boss.fleeing){ const dx=boss.x-player.x,dy=boss.y-player.y, rr=boss.r*0.95; if(dx*dx+dy*dy<rr*rr){
        const bd=Math.min((boss.maxHp||999)*0.1, Math.max(30,(gunDps()||0)*2)); boss.hp-=bd; boss.hitFlash=0.1; floatDamage(boss.x,boss.y-boss.r*0.5,bd,true); hit=true;   // gedeckelt auf max 10% der Boss-HP
        if(boss.hp<=0) startBossDeath(); else bossStomp(dx,dy); } }
    // Sprung-Build (Hybrid): Element-Effekte bei der Landung – Basiswerte standalone, verstärkt durch passende Waffe
    if(mods.jumpShock){ const jd=wpn.chain?wpn.chain.dmg*1.15:Math.max(9,(gunDps()||0)*0.45), jj=2+(wpn.chain?(wpn.chain.jumps||0):0); chainLightning(player.x,player.y,jd,jj,{}); }
    if(mods.jumpFrost){ const amt=wpn.frost?0.18:0.30, dur=wpn.frost?2.4:1.6, R2=(JUMP_R*1.3)*(JUMP_R*1.3); for(const o of obstacles){ const dx=o.cx-player.x,dy=o.cy-player.y; if(dx*dx+dy*dy<R2) applySlow(o,dur,amt); } spawnParticles(player.x,player.y,'#8fe8ff',16,300); }
    // Bounce-Chain (mit Doppelsprung): ein Stomp-Treffer gibt sofort eine Ladung zurück → Gegner-zu-Gegner hüpfen
    if(hit && mods.jumpMax>1 && jumpStock<mods.jumpMax){ jumpStock=Math.min(mods.jumpMax,jumpStock+1); jumpCharge=0; floatText(player.x,player.y-68,'BOUNCE!','#19f0ff',18); beep(990,0.06,'triangle',0.2,520); }
    if(hit){ shake=Math.max(shake,13); flash=Math.max(flash||0,0.32); flashColor='#19f0ff'; spawnParticles(player.x,player.y,'#19f0ff',20,320); floatText(player.x,player.y-30,t('stomp'),'#19f0ff',20); try{ sfxBoom(); }catch(_){ } vibe([22,32]); } }
  // Boss-Stomp: Stagger füllen (voll → kurzer Betäubungs-Stun) + Spieler über den Boss-Radius hinaus in Sicherheit katapultieren
  function bossStomp(dx,dy){ const B=boss;
    B.stagger=(B.stagger||0)+0.34;
    if(B.stagger>=1 && !(B.stun>0)){ B.stagger=0; B.stun=1.4; banner={text:t('bossStun'),sub:'',t:1.4,color:'#ffe600'}; flash=Math.max(flash||0,0.42); flashColor='#ffe600'; shake=Math.max(shake,17); sfxWarn(); vibe([40,30,40,30,80]); spawnParticles(B.x,B.y,'#ffe600',32,440); }
    // Katapult: in Gegenrichtung (vom Boss weg) über dessen Radius hinaus, kurzer Steuer-Lock + Invuln über den Flug
    let d=Math.hypot(dx,dy); let nx=d>1?dx/d:0, ny=d>1?dy/d:1;   // (dx,dy)=Spieler→Boss; vom Boss WEG = −n
    const dist=B.r+player.r+90;
    flungX=Math.max(player.r,Math.min(W-player.r,player.x-nx*dist));
    flungY=Math.max(player.r,Math.min(H-player.r,player.y-ny*dist));
    flungT=0.36; invuln=Math.max(invuln,0.8);
    spawnParticles(player.x,player.y,'#19f0ff',22,420); shake=Math.max(shake,12); }
  // CLUTCH: während des Sprungs (unverwundbar) knapp an Kugeln/Hindernissen vorbei = Belohnung + Bullet-Time-Moment (Clip-Material)
  function scanClutch(){ const cr=player.r+30, cr2=cr*cr;
    for(const e of ebullets){ if(e._cl===jumpSeq) continue; const dx=e.x-player.x,dy=e.y-player.y; if(dx*dx+dy*dy<cr2){ e._cl=jumpSeq; jumpClutch++; } }
    for(const o of obstacles){ if(o._cl===jumpSeq) continue; const ox=(o.cx!=null?o.cx:o.x),oy=(o.cy!=null?o.cy:o.y), rr=cr+(o.w?o.w*0.4:0), dx=ox-player.x,dy=oy-player.y; if(dx*dx+dy*dy<rr*rr){ o._cl=jumpSeq; jumpClutch++; } }
    if(jumpClutch>0 && !jumpClutchFired){ jumpClutchFired=true; effects.slowmo=Math.max(effects.slowmo,0.5); flash=Math.max(flash||0,0.3); flashColor='#2effc0'; beep(880,0.07,'triangle',0.22,400); } }
  function clutchReward(n){ n=Math.min(n,12);
    combo+=2+n; setMult(); refillCombo(); bumpCombo();
    const sc=60*n*multiplier; addScore(sc); awardCoins((6+n*4)*chipMult()*diffChip,player.x,player.y-40,true);
    banner={text:t('clutch')+(n>1?' ×'+n:''),sub:t('clutchSub'),t:1.7,color:'#2effc0'};
    floatText(player.x,player.y-34,t('clutch')+'!','#2effc0',24); spawnParticles(player.x,player.y,'#2effc0',26,320);
    shake=Math.max(shake,12); flash=Math.max(flash||0,0.4); flashColor='#2effc0'; sfxNear(); vibe([20,30,40]);
    director=Math.min(1,director+0.05); addStat('clutch',1); unlockAch('clutch'); }

  // ---------- Update ----------
  function update(dt){
    saveRunT+=dt; if(saveRunT>=1.2){ saveRunT=0; saveRun(); }   // periodischer Snapshot (Reload-Fortsetzen)
    // Passivität: keine Eingabe in diesem Frame → eingabefreie Strecke wächst; sonst zurücksetzen. Längste Strecke + Idle-Anteil = „zu leicht / Campen"-Signal
    if(inputDirty){ idleStretch=0; inputDirty=false; } else { idleStretch+=dt; runIdleAcc+=dt; if(idleStretch>runIdleMax) runIdleMax=idleStretch; }
    elapsed+=dt; const dMax=mode==='hardcore'?7.0:6.3, dT=Math.min(elapsed,260)/260; difficulty=(1+dMax*Math.pow(dT,1.42)+Math.max(0,level-8)*0.10)*(BAL.difficulty||1);   // Rampe 260s + sanfter Level-Term ab Lvl 8 → kein Schwierigkeits-Plateau mehr im langen Run · BAL.difficulty = Auto-Balance-Hebel
    const ts=effects.slowmo>0?0.42:1;
    if(invuln>0) invuln-=dt;
    if(bossIntroT>0) bossIntroT-=dt;   // VS-Auftritt läuft in Echtzeit (auch während der Intro-Zeitlupe)
    if(jumping>0){ jumping-=dt; scanClutch(); if(jumping<=0){
        player.x=jumpToX; player.y=jumpToY; player.vx=0; player.vy=0; tgt.x=jumpToX; tgt.y=jumpToY;   // exakt am angetippten Landepunkt aufkommen, BEVOR der Einschlag dort räumt → kein „auf Hindernis gelandet"-Treffer mehr
        jumpLand(); if(jumpClutch>0) clutchReward(jumpClutch); if(mods.jumpStomp) jumpStomp(); } }   // Landung: Einschlag räumt den Landepunkt + Invuln + Clutch + (Upgrade) Stoßwelle
    else if(jumpStock<mods.jumpMax){ jumpCharge+=dt/mods.jumpCd; if(jumpCharge>=1){ jumpCharge=0; jumpStock++; jumpReadyT=1.7; try{ beep(620,0.07,'triangle',0.16,820); setTimeout(()=>beep(930,0.08,'triangle',0.14,900),60); }catch(_){ } vibe(12); } }   // Sprung-Ladung wieder verfügbar → kleine Top-Meldung (auch bei Doppelsprung-Nachladungen)
    if(jumpReadyT>0) jumpReadyT-=dt;
    if(flungT>0){ flungT-=dt; tgt.x=flungX; tgt.y=flungY; if(invuln<flungT) invuln=flungT; }   // Boss-Katapult: Steuerung kurz gesperrt + Invuln, bis der Spieler sicher gelandet ist
    if(mode!=='zen' && jumpStock>=1 && (elapsed||0)>6.5) coach('jump');   // einmaliges Tutorial: Sprung (über Coach-Curriculum)
    if(mode!=='zen' && opt.guns && ownedCount()>=2) coach('syn');   // 2 Waffen → Synergie-System (Coach)
    for(const k in effects) if(effects[k]>0) effects[k]-=dt;
    tickCurses(dt);   // zeitlich begrenzte Flüche herunterzählen + bei 0 zurücksetzen

    // Beat-Clock (rhythmische Spawns + Puls auf dem Backbeat)
    const step8=Math.floor(elapsed/(secPerStep*2)), onStep=step8>beatIdx;
    if(onStep){ beatIdx=step8; if(step8%2===0){ const beat=(step8/2)%4; if(beat===1||beat===3) beatPulse=1; } }
    beatPulse=Math.max(0,beatPulse-dt*3.2);

    // Combo-Decay: Streak verfällt, wenn man zu lange nichts riskiert
    if(combo>0){ comboTime-=dt; if(comboTime<=0){ combo=0; multiplier=1; comboTime=0;
      floatText(player.x,player.y-30,t('comboOut'),'#9a86c9',16); flushComboBonus(player.x,player.y); beep(330,0.12,'sine',0.14,-120); } }

    // Adaptiver Director: pendelt langsam zur Mitte zurück (Near-Miss/Hit schubsen ihn)
    director+=(0.5-director)*Math.min(1,dt*0.25);
    // Flow-Regler: Ziel-Intensität aus Live-Performance (director) + gelerntem Skill-Offset, sanft nachgezogen & gedeckelt
    { let tgtI=0.8+director*0.46+skillBias; if(tgtI<0.8)tgtI=0.8; else if(tgtI>1.26)tgtI=1.26;
      flowI+=(tgtI-flowI)*Math.min(1,dt*0.5); if(flowI<0.8)flowI=0.8; else if(flowI>1.26)flowI=1.26; }
    // Combo-Overdrive ab x8
    const od=multiplier>=8;
    if(od&&!overdrive){ banner={text:t('overdrive'),sub:t('overdriveSub'),t:1.8,color:'#19f0ff'}; flash=Math.max(flash,0.4); flashColor='#19f0ff'; vibe([20,30,20]); }
    overdrive=od;
    if(mkTimer>0){ mkTimer-=dt; if(mkTimer<=0) mkCount=0; }   // Multikill-Fenster
    coach('move'); if(shields>0) coach('shield'); tickCoach(dt);   // Onboarding-Coach (Bewegen direkt, Schild sobald vorhanden)
    { const ri=rankFor(score); if(ri>rankIdx){ rankIdx=ri; banner={text:t('promo'),sub:P('ranks')[ri]||'',t:2.4,color:'#ffe600'}; flash=Math.max(flash,0.4); flashColor='#ffe600'; vibe([15,25,15]); beep(660,0.08,'square',0.25); setTimeout(()=>beep(990,0.1,'square',0.22),90); } }   // Rang-Beförderung
    for(const m of missions){ if(!m.done && m.val()>=m.goal){ m.done=true; awardCoins(Math.round(m.rw*chipMult()*diffChip),player.x,player.y-52,true); banner={text:t('missionDone'),sub:missionText(m),t:2.6,color:'#2effc0'}; flash=Math.max(flash,0.4); flashColor='#2effc0'; vibe([15,25,15]); beep(880,0.08,'square',0.24); setTimeout(()=>beep(1175,0.1,'square',0.22),90); } }   // Run-Missionen erfüllt
    if(endless){ madness+=dt*0.0075; madnessTime+=dt; if(madnessTime>=60) unlockAch('madness'); }   // Wahnsinn-Modus eskaliert – aber gemächlich

    let smolStacks=0, blindStacks=0, energyStacks=0, clownStacks=0; for(const a of activeCurses){ if(a.id==='smol') smolStacks+=(a.stacks||1); else if(a.id==='blind') blindStacks+=(a.stacks||1); else if(a.id==='energy') energyStacks+=(a.stacks||1); else if(a.id==='clown') clownStacks+=(a.stacks||1); }   // Größe/Nebel/Tempo/Dichte rein aus aktiven Stacks → nach Ablauf immer zurück auf Basis (selbstheilend, kein Bookkeeping-Drift)
    const targetR=mods.playerR*(smolStacks?Math.pow(1.28,smolStacks):1);
    player.r+= (targetR-player.r)*0.2;
    const fogTgt=Math.min(0.82,blindStacks*0.6);   // Ziel-Nebel aus aktiven Blind-Stacks
    mods.fog=(mods.fog||0)+(fogTgt-(mods.fog||0))*Math.min(1,dt*1.8);   // smooth ein-/ausblenden (von außen reinkriechen, am Ende sanft raus)
    if(mods.fog<0.004 && fogTgt===0) mods.fog=0;   // sauber auf 0 schnappen, wenn ausgefadet
    mods.obSpeed=energyStacks?Math.pow(1.22,energyStacks):1;   // Obstacle-Tempo des Energy-Fluchs folgt den Stacks → bleibt nie zu schnell hängen
    mods.spawnMult=clownStacks?Math.pow(0.7,clownStacks):1;    // Clown-Gedränge (Spawn-Dichte) folgt den Stacks → bleibt nie dichter hängen
    if(jumping>0){   // gerichteter Sprung: deterministisch Start→Landepunkt (easeInOut) → leapt zuverlässig genau aufs Ziel, über alles drüber
      const jd=mods.jumpDur||0.55, p=Math.max(0,Math.min(1,1-jumping/jd)), e=p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
      player.x=jumpFromX+(jumpToX-jumpFromX)*e; player.y=jumpFromY+(jumpToY-jumpFromY)*e; player.vx=0; player.vy=0;
    } else if(mods.slip){   // Bananen-Boden: trägheits-/impulsbasiert → das Schiff driftet, übersteuert und rutscht (deutlich schwerer zu steuern)
      const k=16, fr=Math.pow(0.905,dt*60);
      player.vx=((player.vx||0)+(tgt.x-player.x)*k*dt)*fr; player.vy=((player.vy||0)+(tgt.y-player.y)*k*dt)*fr;
      player.x+=player.vx*dt; player.y+=player.vy*dt;
    } else {
      const fol=mods.follow*((jumping>0||flungT>0)?2.7:1);   // beim Sprung/Katapult schneller nachziehen → echter Satz weg von der Gefahr
      player.x+=(tgt.x-player.x)*Math.min(1,dt*fol);
      player.y+=(tgt.y-player.y)*Math.min(1,dt*fol);
      player.vx=0; player.vy=0;
    }
    player.x=Math.max(player.r,Math.min(W-player.r,player.x));
    player.y=Math.max(player.r,Math.min(H-player.r,player.y));
    player.trail.push({x:player.x,y:player.y}); if(player.trail.length>18) player.trail.shift();
    updateStars(dt);

    // Level wird durch Boss-Sieg abgeschlossen. Zen kennt keine Bosse → dort weiterhin zeitbasiert.
    if(mode==='zen'){ levelTimer-=dt; if(levelTimer<=0) levelUp(); }
    // Roguelite-Ramp: in JEDEM Level 1 droppen 3 Skillpunkte zum Aufsammeln (Build verfällt beim Game Over → verlässlicher Start-Nachschub pro Run)
    if(level===1 && !bossActive && mode!=='zen' && onbDrops<3){
      const frac=bossTimer/combatDur();   // 1 → 0 über Level 1
      if(frac<=[0.72,0.46,0.2][onbDrops]){ spawnSP(rand(70,W-70),-20); onbDrops++; } }
    // Upgrade trigger
    if(!bossActive && score>=nextUpgradeAt){ openUpgrade(); return; }

    // Boss timing
    if(mode!=='zen'){
      if(!bossActive){
        if(bossPending){ bossPending=false; startBoss(); }       // nach Arsenal-Pick: Boss starten
        else { bossTimer-=dt; if(bossTimer<=0){
          // Kurz vor dem Boss: Upgrade-Karte + Skillpunkt anbieten
          if(opt.guns||offerPool().length){ bossPending=true; openUpgrade(true); return; } else startBoss();
        } }
      }
      else if(boss){ updateMegaBoss(dt,ts); }
      else { bossPhaseT-=dt;
        if(bossPhaseT>1.6){ laserSpawnT-=dt; if(laserSpawnT<=0){ spawnLaserWave(); laserSpawnT=Math.max(0.7,1.5-bossNumber*0.08); } }
        if(bossPhaseT<=0 && lasers.length===0) endBoss();
      }
    }
    // Spawns – auf das nächste Achtel quantisiert (alles passiert „auf dem Beat")
    // Verschnaufpausen: ab und zu kurzes ruhiges Fenster (kein Spawn) + kleine positive Überraschung
    if(breatherActive>0) breatherActive-=dt;
    else if(!bossActive && elapsed>14){ breatherT-=dt; if(breatherT<=0){ triggerBreather(); breatherT=rand(30,42); } }
    if(!bossActive && breatherActive<=0){ spawnT-=dt; if(spawnT<=0) spawnQueued=true;
      if(spawnQueued && onStep){ spawnObstacle(); spawnQueued=false;
        spawnT=Math.max(0.3-lateDom(),(1.32-difficulty*0.05-level*0.022)*(1+Math.max(0,4-level)*0.3)*(mods.spawnMult||1)*(1-(director-0.5)*0.28)*difDen()*dpsDen()*(1+1.9*introT())/diffDen/(BAL.spawnRate||1)); } }   // Spawn-Floor sinkt im Endgame (lateDom) → durchbricht die Dichte-Decke, die starke Builds OP werden lässt
    // (Orbs entfernt – Münzen übernehmen Combo+Punkte+Geld)
    // Münzen fallen laufend (Haupt-Einkommensquelle), gelegentlich als ganze Gruppe
    coinT-=dt; if(coinT<=0){ if(!bossActive){ if(Math.random()<0.25) spawnCoinGroup(); else spawnCoin(); } coinT=rand(1.1,2.1); }
    // Power-Ups: Drops aus Gegnern (killObstacle) + leichte Grund-Spawn-Uhr, damit auch am Anfang welche kommen
    powerupT-=dt; if(powerupT<=0){ if(powerups.length<2 && !bossActive) spawnPowerup(); powerupT=rand(13,19); }
    chestT-=dt; if(chestT<=0){ if(!bossActive && (level>=2)) spawnChest(); chestT=rand(40,60); }   // Beute-Truhe: selten, schwebt durchs Feld (Risiko/Belohnung)
    // Auto-Fire (sobald eine Waffe ausgerüstet ist)
    // Auto-Fire pro Waffe (touch-freundlich: feuert selbstständig sobald Cooldown bereit, Zielen automatisch)
    if(opt.guns){
      if(wpn.blaster){ tBlast-=dt; if(tBlast<=0){ fireBlaster(); tBlast=1/wpn.blaster.rate; } }
      if(wpn.missile){ tMiss-=dt;  if(tMiss<=0){  fireMissileW(); tMiss=1/wpn.missile.rate; } }
      if(wpn.flame){   tFlame-=dt; if(tFlame<=0){ fireFlame();    tFlame=1/wpn.flame.rate; } }
      if(wpn.frost){   tFrost-=dt; if(tFrost<=0){ fireFrost();    tFrost=1/wpn.frost.rate; } }
      if(wpn.chain){   tChain-=dt; if(tChain<=0){ fireChainW();   tChain=1/wpn.chain.rate; } }
      if(wpn.nova){    tNova-=dt;  if(tNova<=0){  fireNova();     tNova=1/wpn.nova.rate; } }
      if(wpn.rail){    tRail-=dt;  if(tRail<=0){  fireRail();     tRail=1/wpn.rail.rate; } }
      if(synNovas.length){ const q=synNovas.splice(0,6); for(const p of q) miniNova(p.x,p.y); }   // VOLTBOGEN: gequeuete Mini-Novas – max 6/Frame (deckelt die Ketten-Reaktion, Rest folgt)
      for(let i=beams.length-1;i>=0;i--){ beams[i].t-=dt; if(beams[i].t<=0) beams.splice(i,1); }
      for(let i=zaps.length-1;i>=0;i--){ zaps[i].t-=dt; if(zaps[i].t<=0) zaps.splice(i,1); }
      for(let i=novas.length-1;i>=0;i--){ novas[i].t+=dt; if(novas[i].t>=novas[i].life) novas.splice(i,1); }
    }
    for(let i=gibs.length-1;i>=0;i--){ const g=gibs[i]; g.x+=g.vx*dt; g.y+=g.vy*dt; g.vy+=g.grav*dt; g.vx*=0.99; g.rot+=g.vr*dt; g.life-=dt; if(g.life<=0||g.y>H+50) gibs.splice(i,1); }   // Gibs immer (auch ohne Waffen, z.B. Boss-Splatter)
    if(egg67T>0) egg67T-=dt;
    if(!egg67done && score>=67){ egg67done=true; floatText(player.x,player.y-52,'6 7 !!','#ffe600',26); sfx67(); vibe([30,30]); }
    commentT-=dt; if(commentT<=0 && !bossActive){ floatText(W/2+rand(-30,30),H*0.2,pick(P('dumb')),'#9be7ff',16); commentT=rand(15,26); }

    // Lasers
    for(let i=lasers.length-1;i>=0;i--){ const L=lasers[i]; L.t+=dt*ts;
      if(L.state==='warn'&&L.t>=L.warnDur){ L.state='fire'; L.t=0; sfxFire(); shake=Math.max(shake,6); vibe(20); }
      if(L.state==='fire'){ const hit=L.orient==='v'?Math.abs(player.x-L.pos)<L.thick/2+player.r:Math.abs(player.y-L.pos)<L.thick/2+player.r;
        if(hit){ if(hitPlayer('#ff2e88','laser')) return; } if(L.t>=L.fireDur) lasers.splice(i,1); } }

    // Obstacles
    for(let i=obstacles.length-1;i>=0;i--){ const o=obstacles[i];
      if(o.hitFlash>0) o.hitFlash-=dt;
      // Frost: verlangsamt die Bewegung; Brand: Schaden über Zeit
      if(o.slow>0){ o.slow-=dt; if(o.slow<=0) o.slowAmt=1; }   // Slow ausgelaufen → Resttempo zurück (ccSat bleibt: Wieder-Einfrieren ist gesättigt)
      if(o.burn>0){ o.burn-=dt; let bd=(o.burnDmg||0); if(syn.thermo&&o.slow>0) bd*=2.6;   // THERMOSCHOCK: brennend+gefroren
        o.hp-=bd*dt;
        if(Math.random()<0.8) emitP(o.cx+rand(-o.w*0.35,o.w*0.35),o.cy+rand(-4,6),rand(-18,18),-rand(45,100),0.45,Math.random()<0.4?'#ffe24d':'#ff5a1a',rand(3,6));   // aufsteigende Glut
        o.burnTick=(o.burnTick||0)+bd*dt; if(o.burnTick>=3){ floatDamage(o.cx+rand(-6,6),o.cy-o.h*0.5,o.burnTick,false); o.burnTick=0; }   // sichtbarer Brennschaden
        if(o.hp<=0){ if(o.burnConsume) addScore(6); killObstacle(o); obstacles.splice(i,1); continue; } }
      if(o.slow>0 && Math.random()<0.3) emitP(o.cx+rand(-o.w*0.4,o.w*0.4),o.cy+rand(-o.h*0.4,o.h*0.4),0,rand(8,26),0.5,'#cdf2ff',rand(2,4));   // Frost-Funkeln
      const mt=dt*ts*(o.slow>0?(o.slowAmt!=null?o.slowAmt:0.5):1);
      if(o.pattern!=='straight'){ o.trail.push({x:o.cx,y:o.cy}); if(o.trail.length>9) o.trail.shift(); }
      if(o.pattern==='straight'){ o.cy+=o.vy*mt; o.cx+=o.vx*mt; if(o.shape==='diamond')o.rot+=o.vr*mt; if(o.cx<o.w/2||o.cx>W-o.w/2)o.vx*=-1; }
      else if(o.pattern==='sine'){ o.cy+=o.vy*mt; o.cx=o.baseX+o.amp*Math.sin(o.cy*o.freq+o.phase); }
      else if(o.pattern==='drift'){ o.vx+=o.ax*mt; o.cx+=o.vx*mt; o.cy+=o.vy*mt; o.rot+=o.vr*mt*0.3; }
      else if(o.pattern==='orbit'){ o.centerY+=o.vy*mt; o.ang+=o.angVel*mt; o.cx=o.baseX+o.radius*Math.cos(o.ang); o.cy=o.centerY+o.radius*Math.sin(o.ang); }
      else if(o.pattern==='zigzag'){ o.cy+=o.vy*mt; o.cx+=o.vx*mt; if(o.cx<o.w/2){o.cx=o.w/2;o.vx*=-1;} if(o.cx>W-o.w/2){o.cx=W-o.w/2;o.vx*=-1;} o.rot+=8*mt; }
      else if(o.pattern==='pendulum'){ o.cy+=o.vy*mt; o.ang+=o.angVel*mt; o.cx=o.baseX+o.swing*Math.sin(o.ang); }
      else if(o.pattern==='flank'){ const tx=player.x; o.cx+=Math.sign(tx-o.cx)*Math.min(Math.abs(tx-o.cx),(o.flankPull||220)*mt); o.cy+=o.vy*mt; o.rot+=7*mt; if(o.cx<o.w/2)o.cx=o.w/2; else if(o.cx>W-o.w/2)o.cx=W-o.w/2; }   // FLANKER: jagt aggressiv deine Spalte & sinkt dabei ab → zwingt zum Ausweichen statt Dauer-Camping
      if(o.elite){ const tx=player.x, pull=42*mt;   // Camper-Konter: Elites lehnen sich sanft auf deine x-Position zu → reines Unten-Sitzen-und-Abräumen wird bestraft
        if(o.baseX!=null) o.baseX+=Math.sign(tx-o.baseX)*Math.min(Math.abs(tx-o.baseX),pull);
        o.cx+=Math.sign(tx-o.cx)*Math.min(Math.abs(tx-o.cx),pull);
        if(o.cx<o.w/2)o.cx=o.w/2; else if(o.cx>W-o.w/2)o.cx=W-o.w/2; }

      if(o.shooter && o.cy>20 && o.cy<H*0.72){ o.fireT-=dt*ts; if(o.fireT<=0){ fireEnemyShot(o); o.fireT=rand(2.0,3.2); } }   // Schütze feuert vereinzelt (nur im sichtbaren oberen Bereich, Slowmo wirkt mit)
      if(o.chest){ if(o.cy-o.h>H+48) obstacles.splice(i,1); continue; }   // Truhe: harmlos für den Spieler (kein Schaden/Near-Miss) – nur von Waffen zerstörbar
      const hw=o.w/2,hh=o.h/2;
      // Rotations- & formgenaue Hitbox (fairer als die alte AABB für alle Formen)
      let lx=player.x-o.cx, ly=player.y-o.cy;
      if(o.rot){ const c=Math.cos(o.rot), s=Math.sin(o.rot), rx=lx*c+ly*s; ly=-lx*s+ly*c; lx=rx; }
      let d2;
      if(o.shape==='rect'||o.shape==='long'||o.shape==='capsule'){
        const qx=Math.max(-hw,Math.min(lx,hw)), qy=Math.max(-hh,Math.min(ly,hh)), ex=lx-qx, ey=ly-qy; d2=ex*ex+ey*ey;
      } else if(o.shape==='ring'){
        const R=o.w*0.4, t=o.w*0.13, dd=Math.max(0,Math.abs(Math.hypot(lx,ly)-R)-t); d2=dd*dd; // Loch in der Mitte ist sicher
      } else { // diamond/tri/hex/star → eng anliegender effektiver Radius statt Eck-Leerraum
        const er=o.w*({diamond:0.44,tri:0.44,hex:0.46,star:0.46}[o.shape]||0.45), dd=Math.max(0,Math.hypot(lx,ly)-er); d2=dd*dd;
      }
      if(invuln<=0 && d2<player.r*player.r){ spawnParticles(player.x,player.y,o.color,10,180); obstacles.splice(i,1); if(hitPlayer(o.color, o.elite?'elite':'obs:'+(o.pattern||'straight'))) return; continue; }
      const nr=player.r+mods.nearRadius;
      if(invuln<=0 && o.near){ const gap=Math.sqrt(d2)-player.r; if(gap<o.minGap) o.minGap=gap; }
      if(!o.near && invuln<=0 && d2<nr*nr && d2>player.r*player.r){ o.near=true; o.minGap=Math.sqrt(d2)-player.r; doNear(o); }
      if(o.cy-hh>H+40){ if(!o.scored){addScore(1);o.scored=true;}
        if(o.near && o.minGap<player.r*0.5) perfectDodge(o);
        obstacles.splice(i,1); }
    }

    // Bolzen (Auto-Fire): nach oben, treffen Hindernisse
    for(let bi=bullets.length-1;bi>=0;bi--){ const b=bullets[bi];
      if(b.homing){ steerMissile(b,dt); b.life-=dt; if(b.life<=0){ explodeMissile(b); bullets.splice(bi,1); continue; }
        if(Math.random()<0.6) spawnParticles(b.x,b.y+b.r*0.6,'#ff6a00',1,60); }
      else if(b.frag){ b.life-=dt; if(b.life<=0){ bullets.splice(bi,1); continue; } }
      b.x+=b.vx*dt; b.y+=b.vy*dt;
      if(b.y<-40||b.x<-40||b.x>W+40||b.y>H+60){ bullets.splice(bi,1); continue; }
      let gone=false;
      for(let oi=obstacles.length-1;oi>=0;oi--){ const o=obstacles[oi];
        const er=Math.max(o.w,o.h)*0.5+b.r; const ddx=b.x-o.cx, ddy=b.y-o.cy;
        if(ddx*ddx+ddy*ddy<er*er){
          if(b.homing){ explodeMissile(b); gone=true; break; }
          const hit=rollHit(b.dmg); let dmg=hit.dmg; if(o.slow>0 && mods.brittle) dmg*=1.5;     // Krit + SPRÖDE
          if(o.shield>0){ o.shield-=dmg; o.hitFlash=0.12; spawnParticles(b.x,b.y,'#2effc0',hit.crit?5:3,140); if(o.shield<0){ o.hp+=o.shield; o.shield=0; } }   // Schild fängt direkte Bolzen ab (Rest-Überlauf trifft HP)
          else { o.hp-=dmg; o.hitFlash=0.12; spawnParticles(b.x,b.y,hit.crit?'#ff3b3b':(b.col||'#caffff'),hit.crit?6:3,hit.crit?180:120); }
          if(!b.frag){ floatDamage(o.cx,o.cy-o.h*0.45,dmg,hit.crit); if(hit.crit) beep(1500,0.04,'square',0.1,420); }
          if(b.burn){ o.burn=Math.max(o.burn||0,b.burnDur||1.8); o.burnDmg=Math.max(o.burnDmg||0,b.burn); o.burnSpread=b.burnSpread; o.burnConsume=b.burnConsume; }
          if(b.frost){ const amt=(b.freeze&&Math.random()<0.4)?0.05:b.frost; applySlow(o,b.frostDur||1.4,amt); spawnParticles(b.x,b.y,'#8fe8ff',2,80); }
          if(b.tesla){ chainLightning(o.cx,o.cy,(wpn.chain?wpn.chain.dmg:1.4)*0.8,2,{skip:[o]}); }  // TESLA-SALVE
          if(b.splash) chainAoe(o.cx,o.cy,dmg*0.45);                                       // SPERRFEUER: kleiner Explosions-Splash
          if(o.hp<=0){ const ox=o.cx,oy=o.cy,wasSlow=o.slow>0; if(b.novakill) synNovas.push({x:ox,y:oy}); killObstacle(o); obstacles.splice(oi,1);   // SCHOCK-BOLZEN: Mini-Nova beim Kill
            if(mods.shatter && wasSlow) shatterBurst(ox,oy,b.dmg);                        // SPLITTERBRUCH: Splitter-Explosion
            if(wpn.chain && wpn.chain.onHit) chainLightning(ox,oy,wpn.chain.dmg*0.7,2,{}); } // GEWITTER: Kette auch bei Bolzen-Kill
          if(b.pierce>0){ b.pierce--; } else { gone=true; }
          break;
        }
      }
      // Bolzen/Rakete gegen Mega-Boss
      if(!gone && boss && !boss.dead && !boss.fleeing){ const bdx=b.x-boss.x, bdy=b.y-boss.y, br=boss.r+b.r;
        if(bdx*bdx+bdy*bdy<br*br){
          if(b.homing){ explodeMissile(b); gone=true; }
          else { const h=rollHit(b.dmg); boss.hp-=h.dmg; boss.hitFlash=0.07; spawnParticles(b.x,b.y,h.crit?'#ff3b3b':'#ffe600',h.crit?6:3,150); beep(660,0.03,'square',0.05,120);
            if(!b.frag){ floatDamage(boss.x+rand(-12,12),boss.y-boss.r*0.5,h.dmg,h.crit); if(h.crit) beep(1500,0.04,'square',0.1,420); }
            if(boss.hp<=0) startBossDeath();
            if(b.pierce>0){ b.pierce--; } else gone=true; } } }
      if(gone) bullets.splice(bi,1);
    }

    // Gegner-Kugeln (Mega-Boss)
    for(let i=ebullets.length-1;i>=0;i--){ const e=ebullets[i]; e.x+=e.vx*dt*ts; e.y+=e.vy*dt*ts;
      if(e.x<-40||e.x>W+40||e.y<-40||e.y>H+40){ ebullets.splice(i,1); continue; }
      const dx=player.x-e.x, dy=player.y-e.y, rr=player.r+e.r;
      if(invuln<=0 && dx*dx+dy*dy<rr*rr){ ebullets.splice(i,1); if(hitPlayer('#ff2e88','bullet')) return; }
    }


    // Power-ups
    for(let i=powerups.length-1;i>=0;i--){ const p=powerups[i]; p.y+=p.vy*dt*ts; p.pulse+=dt*5;
      const dx=player.x-p.x,dy=player.y-p.y,rr=player.r+p.r+4;
      if(dx*dx+dy*dy<rr*rr){ collectPup(p); powerups.splice(i,1); continue; }
      if(p.y>H+30) powerups.splice(i,1);
    }

    // Sammel-Symbole (Upgrades & Flüche) – schwebende Items zum Aufsammeln
    gemT-=dt; if(gemT<=0){ if(!bossActive && (level>=2||(elapsed||0)>30)) spawnGem(); gemT=rand(12,20)/Math.max(0.5,mods.powerupRate||1); }   // Glück erhöht NUR die Drop-Rate; Pacing: erst ab Lvl 2 / >30s
    for(let i=gems.length-1;i>=0;i--){ const g=gems[i]; g.y+=g.vy*dt*ts; g.pulse+=dt*4; g.rot+=dt*1.5;
      const dx=player.x-g.x,dy=player.y-g.y,rr=player.r+g.r+4;
      if(dx*dx+dy*dy<rr*rr){ collectGem(g); gems.splice(i,1); continue; }
      if(g.y>H+30) gems.splice(i,1);
    }
    if(loot) for(let i=loot.length-1;i>=0;i--){ const L=loot[i]; L.y+=L.vy*dt*ts; L.pulse+=dt*4; L.rot+=dt*1.3;   // Beute-Drops (Phase 2): fallen herab, einsammeln durch Berühren
      const dx=player.x-L.x,dy=player.y-L.y,rr=player.r+L.r+4;
      if(dx*dx+dy*dy<rr*rr){ collectLoot(L); loot.splice(i,1); continue; }
      if(L.y>H+34) loot.splice(i,1);
    }

    // Skillpunkt-Drops – langsam sinkend, dezente Nah-Anziehung (wertvoll → fair einsammelbar), Magnet saugt voll
    for(let i=sps.length-1;i>=0;i--){ const s=sps[i]; s.pulse+=dt*4; s.rot+=dt*1.2;
      const mag=effects.magnet>0, pull=mag?460:90, rng=mag?Math.max(W,H)*0.25:150, dd=Math.hypot(player.x-s.x,player.y-s.y);   // Magnet max ¼ Bildschirm
      if(dd>1&&dd<rng){ const a=Math.atan2(player.y-s.y,player.x-s.x); s.x+=Math.cos(a)*pull*dt; s.y+=Math.sin(a)*pull*dt; }
      s.y+=s.vy*dt*ts;
      const dx=player.x-s.x,dy=player.y-s.y,rr=player.r+s.r+6;
      if(dx*dx+dy*dy<rr*rr){ collectSP(s); sps.splice(i,1); continue; }
      if(s.y>H+30) sps.splice(i,1);
    }

    // Münz-Pickups – sinken, Magnet/Nah-Sog; Wert × Combo-Multiplikator beim Einsammeln
    for(let i=coinz.length-1;i>=0;i--){ const c=coinz[i]; c.pulse+=dt*5; c.rot+=dt;
      const mag=effects.magnet>0, pull=mag?460:mods.magnetPassive, rng=mag?Math.max(W,H)*0.25:165, dd=Math.hypot(player.x-c.x,player.y-c.y);   // Magnet max ¼ Bildschirm
      if(pull>0&&dd>1&&dd<rng){ const a=Math.atan2(player.y-c.y,player.x-c.x); c.x+=Math.cos(a)*pull*dt; c.y+=Math.sin(a)*pull*dt; }
      c.y+=c.vy*dt*ts;
      const dx=player.x-c.x,dy=player.y-c.y,rr=player.r+c.r+4;
      if(dx*dx+dy*dy<rr*rr){ combo++; setMult(); refillCombo(); director=Math.min(1,director+0.012); runOrbs++;   // Münzen bauen jetzt auch Combo + geben Punkte (Orbs sind dadurch überflüssig)
        addScore(Math.round(8*multiplier));
        const dbl=effects.double>0?2:1;                                  // ×2-Power-up wirkt auch auf Münzen
        const flat=c.val*(mods.orbValueMult||1);                         // Grundwert ohne Combo
        const amt=Math.max(1,Math.round(flat*coinMult()*dbl));           // coinMult() ist der EINZIGE Combo-Faktor (kein Doppel-Multiplikator mehr → Coin-Flut behoben)
        comboCoinBonus+=Math.max(0,amt-Math.round(flat*dbl));            // nur der Combo-Anteil für die Anzeige am Combo-Ende
        awardCoins(amt,c.x,c.y-14,c.val>=5);
        spawnParticles(c.x,c.y,'#ffe066',c.val>=5?14:8,200); sfxCoin(); bumpCombo(); vibe(9); flash=Math.min(0.45,flash+0.08); flashColor='#ffd23f'; coinz.splice(i,1); continue; }
      if(c.y>H+26) coinz.splice(i,1);
    }

    // Particles & floaters
    pAlive=0; for(const p of particles){ if(p.life<=0) continue; pAlive++; p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.94;p.vy*=0.94;p.life-=p.decay; }   // Pool: tote Slots ueberspringen, kein splice; lebende zählen
    for(let i=floaters.length-1;i>=0;i--){ const f=floaters[i]; f.y+=f.vy*dt; f.vy*=0.96; if(f.vx){ f.x+=f.vx*dt; f.vx*=0.92; } f.life-=dt*(f.dr||0.9); if(f.life<=0)floaters.splice(i,1); }

    if(banner){ banner.t-=dt; if(banner.t<=0) banner=null; }
    displayScore+=(score-displayScore)*Math.min(1,dt*10);
    accrueChips(false);                                   // Coins laufend verdienen (Live-Guthaben, gedrosselt gespeichert)
    shake=Math.max(0,shake-dt*60); flash=Math.max(0,flash-dt*1.5); nearGlow=Math.max(0,nearGlow-dt*2);
    scoreEl.textContent=fmt(displayScore); comboEl.textContent='x'+multiplier;
    if(coinHud) coinHud.textContent='🪙 '+fmt(meta.chips||0);
    const cf=(combo>0&&comboTimeMax>0)?Math.max(0,Math.min(1,comboTime/comboTimeMax)):0;
    comboFillEl.style.transform='scaleX('+cf+')'; comboBarEl.classList.toggle('on',combo>0);
  }

  function doNear(o){ combo+=1+mods.comboBonus; setMult(); refillCombo(); const g=5*multiplier; addScore(g);
    spawnParticles(player.x,player.y,'#ffe600',4,150); sfxNear(); bumpCombo(); vibe(6);   // ruhiger: weniger Partikel, KEIN '+x'-Text pro Near-Miss (war Dauer-Spam)
    director=Math.min(1,director+0.025);
    nearGlow=Math.min(1,nearGlow+0.5); nearCount++;
    coach('near');   // erster Near-Miss → Coach erklärt Combo/Münzen
    unlockAch('firstNear');
    if(nearCount%5===0){ floatText(player.x,player.y-46,pick(P('near')),'#19f0ff',20); shake=Math.max(shake,5); vibe([10,15]);
      awardCoins((2+multiplier*0.6)*chipMult()*diffChip,player.x+22,player.y-26); } }   // Combo-Strähne = Coin-Bündel (auch in BLITZ ohne Orbs)
  // Ultra-knapper Ausweicher → Extra-Bonus
  function perfectDodge(o){ const pb=Math.round(8*multiplier); addScore(pb); combo++; setMult(); refillCombo();
    floatText(player.x,player.y-50,t('perfect'),'#ff2e88',24); beep(1200,0.1,'square',0.2,520);
    flash=Math.min(0.6,flash+0.2); flashColor='#ff2e88'; nearGlow=1; shake=Math.max(shake,8); vibe([12,18,12]);
    director=Math.min(1,director+0.05); spawnParticles(player.x,player.y,'#ff2e88',10,240);
    runPerfect++; if(statN('perfect')+runPerfect>=10) unlockAch('perfect10'); }
  // ---------- Schuss / Explosionen ----------
  // Mündungen: aus den vorstehenden Pixel-Kanten (Nase/Flügel/Kanonen) des aktuellen Schiffs feuern
  let muzIdx=0;
  function shipMuz(){ const m=shipSprite&&shipSprite.muz; return (m&&m.length)?m:[{x:0,y:-((player&&player.r)||12)}]; }
  function muzPrimary(){ const M=shipMuz(); let b=M[0]; for(const m of M) if(m.y<b.y) b=m; return {x:player.x+b.x,y:player.y+b.y}; }
  function muzAt(i){ const M=shipMuz(), m=M[((i%M.length)+M.length)%M.length]; return {x:player.x+m.x,y:player.y+m.y}; }
  function muzSpread(i,n){ const M=shipMuz(); if(n<=1||M.length<=1) return muzPrimary(); const m=M[Math.round(i*(M.length-1)/(n-1))]; return {x:player.x+m.x,y:player.y+m.y}; }
  function fireBlaster(){ const w=wpn.blaster, n=w.bolts, spd=640;
    let teslaShot=false; if(syn.tesla){ teslaCount++; teslaShot=(teslaCount%4===0); }   // TESLA-SALVE: jeder 4. Bolzen verzweigt (entschärft)
    const pyro=syn.pyrobolt, pdot=wpn.flame?wpn.flame.dot:0.9*(mods.wDmgMult||1);                                   // PYRO-BOLZEN: entzünden
    const cryo=syn.cryoshot, camt=wpn.frost?wpn.frost.slowAmt:0.55, cdur=wpn.frost?wpn.frost.slowDur:1.2;            // FROST-SALVE: verlangsamen
    const bp=synPartner('blaster'), pcol=bp?wepCol('blaster'):'#caffff', pcol2=bp?WID[bp].col:null;   // Fusions-Mix: Bolzen tragen die Mischfarbe + Partner-Glow
    for(let i=0;i<n;i++){ const ang=(i-(n-1)/2)*w.spread, mp=muzSpread(i,n);
      bullets.push({x:mp.x,y:mp.y,vx:Math.sin(ang)*spd,vy:-Math.cos(ang)*spd,r:5,dmg:w.dmg,pierce:w.pierce,col:pcol,col2:pcol2,tesla:teslaShot,burn:pyro?pdot:0,burnDur:pyro?2.4:0,frost:cryo?camt:0,frostDur:cryo?cdur:0,splash:syn.barrage,novakill:syn.shockbolt}); }
    const fp=muzPrimary(); emitP(fp.x,fp.y,0,-30,0.14,teslaShot?'#9be7ff':pcol,rand(5,8));
    sfxShoot(); }
  function fireFlame(){ const w=wpn.flame, mp=muzAt(muzIdx++);
    const fpp=synPartner('flame');
    bullets.push({x:mp.x,y:mp.y,vx:rand(-30,30),vy:-560,r:6,dmg:w.dmg,pierce:0,col:wepCol('flame'),col2:fpp?WID[fpp].col:null,burn:w.dot,burnDur:w.dur,burnSpread:w.spread,burnConsume:w.consume});
    emitP(mp.x,mp.y,0,-20,0.12,wepCol('flame'),rand(5,9));
    beep(360,0.04,'sawtooth',0.07,90); }
  function fireFrost(){ const w=wpn.frost, mp=muzAt(muzIdx++);
    const zpp=synPartner('frost');
    bullets.push({x:mp.x,y:mp.y,vx:rand(-20,20),vy:-600,r:5,dmg:w.dmg,pierce:1,col:wepCol('frost'),col2:zpp?WID[zpp].col:null,frost:w.slowAmt,frostDur:w.slowDur,freeze:w.freeze,shatter:w.shatter,brittle:w.brittle});
    emitP(mp.x,mp.y,0,-20,0.12,wepCol('frost'),rand(4,7));
    beep(880,0.04,'sine',0.06,240); }
  function fireMissileW(){ const w=wpn.missile; for(let i=0;i<w.count;i++){ const mp=muzSpread(i,w.count);
      const mpp=synPartner('missile');
      bullets.push({x:mp.x+rand(-4,4),y:mp.y,vx:rand(-50,50),vy:-340,r:7,dmg:w.dmg,pierce:0,homing:true,aoe:w.aoe,life:4,col:'#ff9a2e',col2:mpp?WID[mpp].col:null,shrapnel:w.shrapnel,incendiary:w.incendiary}); }
    beep(300,0.05,'square',0.12,160); }
  function fireChainW(){ const w=wpn.chain;
    if(boss&&!boss.dead&&!boss.fleeing){ const dx=boss.x-player.x,dy=boss.y-player.y; if(dx*dx+dy*dy<260*260){
      boss.hp-=w.dmg; boss.hitFlash=0.07; arcParticles(player.x,player.y-player.r,boss.x,boss.y); beep(1200,0.03,'square',0.08,260); if(boss.hp<=0)startBossDeath(); return; } }
    let best=null,bd=99999; for(const o of obstacles){ const dx=o.cx-player.x,dy=o.cy-player.y,d=dx*dx+dy*dy; if(d<bd){bd=d;best=o;} }
    if(!best) return; arcParticles(player.x,player.y-player.r,best.cx,best.cy);
    const h0=rollHit(w.dmg); let dd=h0.dmg; if(syn.super&&best.slow>0) dd*=1.45;
    best.hp-=dd; best.hitFlash=0.1; floatDamage(best.cx,best.cy-best.h*0.4,dd,h0.crit); if(w.stun) applySlow(best,w.stun,0.1);   // Stun zentral über applySlow → respektiert CC-Sättigung & Elite-Widerstand (nicht direkt o.slow setzen)
    if(syn.wildarc){ best.burn=Math.max(best.burn||0,2.2); best.burnDmg=Math.max(best.burnDmg||0,1.3*(mods.wDmgMult||1)); }   // BRAND-BOGEN
    if(w.aoe) chainAoe(best.cx,best.cy,dd*0.5);
    const fx=best.cx,fy=best.cy,skip=[best]; if(syn.voltspark) synNovas.push({x:fx,y:fy}); if(best.hp<=0){ killObstacle(best); const ix=obstacles.indexOf(best); if(ix>=0)obstacles.splice(ix,1); }
    chainLightning(fx,fy,w.dmg,w.jumps-1,{skip,stun:w.stun,aoe:w.aoe}); beep(1300,0.03,'square',0.06,260); }
  // Nova-Puls: radiale Schockwelle um den Spieler (kein Zielen, Crowd-Control)
  function fireNova(){ const w=wpn.nova, R=w.radius;
    for(let k=obstacles.length-1;k>=0;k--){ const o=obstacles[k]; const dx=o.cx-player.x,dy=o.cy-player.y;
      if(dx*dx+dy*dy<R*R){ const h=rollHit(w.dmg); o.hp-=h.dmg; o.hitFlash=0.1; floatDamage(o.cx,o.cy-o.h*0.4,h.dmg,h.crit);
        if(w.slow){ applySlow(o,syn.cryonova?1.8:1.2,syn.cryonova?0.35:0.5); }
        if(syn.embernova){ o.burn=Math.max(o.burn||0,2.2); o.burnDmg=Math.max(o.burnDmg||0,1.2*(mods.wDmgMult||1)); }   // GLUT-NOVA: Puls entzündet
        if(w.knock){ o.cy-=26; }
        if(o.hp<=0){ killObstacle(o); obstacles.splice(k,1); } } }
    if(boss&&!boss.dead&&!boss.fleeing){ const dx=boss.x-player.x,dy=boss.y-player.y; if(dx*dx+dy*dy<(R+boss.r)*(R+boss.r)){ const h=rollHit(w.dmg); boss.hp-=h.dmg; boss.hitFlash=0.07; floatDamage(boss.x,boss.y-boss.r*0.5,h.dmg,h.crit); if(boss.hp<=0) startBossDeath(); } }
    const col=synPartner('nova')?wepCol('nova'):(w.slow?'#8fe8ff':'#c45bff');
    if(novas.length>18) novas.shift(); novas.push({x:player.x,y:player.y,r0:14,rMax:R,t:0,life:0.44,col,fill:true});   // Cap + Schockwellen-Ring mit Füll-Blitz
    for(let i=0;i<22;i++){ const a=i/22*6.28, s=R*2.6; emitP(player.x+Math.cos(a)*16,player.y+Math.sin(a)*16,Math.cos(a)*s,Math.sin(a)*s,0.09,col,rand(3,7)); }
    flash=Math.min(0.5,flash+0.16); flashColor=col; shake=Math.max(shake,7); beep(150,0.15,'sine',0.22,210); vibe(11); }
  // VOLTBOGEN: kleine Nova an einem Ketten-Treffer (entkoppelt verarbeitet, damit das Splicen die Kette nicht stört)
  function miniNova(x,y){ const R=72, dmg=(wpn.nova?wpn.nova.dmg*0.65:2.0)*(mods.wDmgMult||1);
    for(let k=obstacles.length-1;k>=0;k--){ const o=obstacles[k]; const dx=o.cx-x,dy=o.cy-y;
      if(dx*dx+dy*dy<R*R){ o.hp-=dmg; o.hitFlash=0.1; if(o.hp<=0){ killObstacle(o); obstacles.splice(k,1); } } }
    if(novas.length>18) novas.shift(); novas.push({x,y,r0:6,rMax:R,t:0,life:0.28,col:'#c45bff'});
    for(let i=0;i<7;i++){ const a=i/7*6.28; emitP(x,y,Math.cos(a)*R*2,Math.sin(a)*R*2,0.12,'#c45bff',rand(2,4)); }
    beep(220,0.06,'sine',0.10,160); }
  // ---- ÜBERLADUNG (aktive Fusions-Skills, D2-Style): Kills laden – Antippen entfesselt BEIDE Waffen-Komponenten ----
  function ultComponent(wid){ const dm=(mods.wDmgMult||1);
    if(wid==='blaster'){ const d=(wpn.blaster?wpn.blaster.dmg:1.2*dm)*1.6, pp=synPartner('blaster');
      for(let i=0;i<20;i++){ const a=i/20*6.28; bullets.push({x:player.x,y:player.y,vx:Math.cos(a)*620,vy:Math.sin(a)*620,r:5,dmg:d,pierce:1,life:1.2,col:wepCol('blaster'),col2:pp?WID[pp].col:null}); } }
    else if(wid==='missile'){ const d=(wpn.missile?wpn.missile.dmg:4*dm)*1.3, pp=synPartner('missile');
      for(let i=0;i<3;i++) bullets.push({x:player.x+(i-1)*22,y:player.y-10,vx:rand(-160,160),vy:-300,r:8,dmg:d,homing:true,aoe:120,life:4,col:'#ff9a2e',col2:pp?WID[pp].col:null}); }
    else if(wid==='flame'){ for(const o of obstacles){ o.burn=Math.max(o.burn||0,3.2); o.burnDmg=Math.max(o.burnDmg||0,1.6*dm); emitP(o.cx,o.cy,0,-40,0.2,wepCol('flame'),rand(4,7)); } }
    else if(wid==='frost'){ for(const o of obstacles){ applySlow(o,2.6,0.22); emitP(o.cx,o.cy,0,20,0.2,wepCol('frost'),rand(3,6)); } }
    else if(wid==='chain'){ chainLightning(player.x,player.y-20,(wpn.chain?wpn.chain.dmg:2.5*dm)*1.4,9,{}); }
    else if(wid==='nova'){ const R=250, d=(wpn.nova?wpn.nova.dmg:3.2*dm)*1.6;
      for(let k=obstacles.length-1;k>=0;k--){ const o=obstacles[k],dx=o.cx-player.x,dy=o.cy-player.y;
        if(dx*dx+dy*dy<R*R){ o.hp-=d; o.hitFlash=0.1; o.cy-=34; if(o.hp<=0){ killObstacle(o); obstacles.splice(k,1); } } }
      if(novas.length>18) novas.shift(); novas.push({x:player.x,y:player.y,r0:18,rMax:R,t:0,life:0.5,col:wepCol('nova'),fill:true}); }
    else if(wid==='rail'){ const d=(wpn.rail?wpn.rail.dmg:5*dm)*1.2, wdt=30;
      for(const off of [-110,0,110]){ const bx=Math.max(20,Math.min(W-20,player.x+off));
        for(let k=obstacles.length-1;k>=0;k--){ const o=obstacles[k]; if(Math.abs(o.cx-bx)<wdt+(o.w?o.w/2:0)){ o.hp-=d; o.hitFlash=0.12; if(o.hp<=0){ killObstacle(o); obstacles.splice(k,1); } } }
        beams.push({x:bx,w:wdt,t:0.22,col:wepCol('rail')}); } } }
  function fireUlt(id){ if(state!==S.PLAY||!syn[id]||(synCharge[id]||0)<1||!player) return; synCharge[id]=0;
    const s=SID[id]; ultComponent(s.pair[0]); ultComponent(s.pair[1]);
    flash=Math.min(0.6,flash+0.3); flashColor='#ff2e88'; shake=Math.max(shake,12); vibe([20,30,20]);
    floatText(player.x,player.y-44,s.ico+' '+synName(id)+'!','#ff7ab8',20); sfxPow(); }
  // Railgun: sofortige Schiene auf die nächste Bedrohung – trifft alle Ziele in der Spalte
  function fireRail(){ const w=wpn.rail; const bx=player.x;   // Strahl kommt AUS dem Schiff (gerade nach oben) – kein Auto-Aim mehr; gezielt wird über die Schiffsposition
    const baseY=player.y-player.r-2;
    for(let k=obstacles.length-1;k>=0;k--){ const o=obstacles[k]; if(o.cy>baseY+12) continue;
      if(Math.abs(o.cx-bx)<w.width+(o.w?o.w/2:0)){ const h=rollHit(w.dmg); o.hp-=h.dmg; o.hitFlash=0.12; floatDamage(o.cx,o.cy-o.h*0.4,h.dmg,h.crit);
        if(w.burn){ o.burn=Math.max(o.burn||0,2.6); o.burnDmg=Math.max(o.burnDmg||0,1.2*(mods.wDmgMult||1)); }
        if(syn.cryorail){ applySlow(o,2.2,0.3); }   // FROST-SCHIENE: vereist die Spalte
        if(o.hp<=0){ killObstacle(o); obstacles.splice(k,1); } } }
    if(boss&&!boss.dead&&!boss.fleeing && Math.abs(boss.x-bx)<w.width+boss.r && boss.y<baseY){ const h=rollHit(w.dmg*1.5); boss.hp-=h.dmg; boss.hitFlash=0.07; floatDamage(boss.x,boss.y-boss.r*0.5,h.dmg,h.crit); if(boss.hp<=0) startBossDeath(); }
    if(syn.railnova) synNovas.push({x:bx,y:baseY-40});                                   // SCHIENEN-NOVA: Nova in der Schussspalte
    if(syn.railchain && wpn.chain) chainLightning(bx,baseY-40,wpn.chain.dmg*1.0,wpn.chain.jumps,{});   // SCHIENEN-KETTE
    beams.push({x:bx,w:w.width,t:0.22,col:wepCol('rail')}); flash=Math.min(0.5,flash+0.16); flashColor=wepCol('rail'); shake=Math.max(shake,8); beep(110,0.16,'sawtooth',0.32,-50); vibe(10);
    for(let i=0;i<10;i++){ emitP(bx+rand(-w.width,w.width),baseY-rand(0,player.y),0,-rand(60,200),0.18,'#fff27a',rand(2,5)); }   // Mündungs-/Spalten-Funken
    pixelBurst(bx,baseY-6,'#fff7c0',5); }
  function pixelBurst(x,y,color,power){ const n=Math.max(3,Math.round((8+Math.min(20,(power||1)*5))*fxQ)), wn=Math.max(1,Math.round(4*fxQ));   // fxQ: Burst bei Lag kleiner
    for(let i=0;i<n;i++){ const a=Math.random()*6.28,s=rand(80,270); emitP(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(0.02,0.045),color,rand(3,7)); }
    for(let i=0;i<wn;i++){ const a=Math.random()*6.28,s=rand(40,160); emitP(x,y,Math.cos(a)*s,Math.sin(a)*s,0.05,'#ffffff',rand(3,6)); } }
  // Fliegende Fetzen/Chunks mit Schwerkraft (Boss-Splatter „wie ein Luftballon")
  function spawnGibs(x,y,n,cols,spd,grav){ n=Math.max(2,Math.round(n*fxQ));
    for(let i=0;i<n;i++){ if(gibs.length>140) gibs.shift(); const a=Math.random()*6.28, s=rand(spd*0.35,spd);
      gibs.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rand(60,200),rot:Math.random()*6.28,vr:rand(-10,10),size:rand(4,12),color:cols[(Math.random()*cols.length)|0],life:rand(0.8,1.6),grav:grav||520}); } }
  function killObstacle(o){ if(o.chest){ openChest(o); return; }   // Truhe kaputtgeschossen → Loot-Explosion (kein Standard-Kill/Score)
    const pts=3*(o.maxHp||1); addScore(pts);
    mkTimer=0.7; mkCount++;
    if(mkCount===3||mkCount===6||mkCount===10||(mkCount>10&&mkCount%5===0)){ const mc=mkCount>=10?'#ff2ee0':(mkCount>=6?'#ff9a2e':'#ffe600'); floatText(player.x,player.y-58,t('multikill')+' ×'+mkCount,mc,22); addScore(Math.round(pts*mkCount*0.5)); beep(Math.min(1500,700+mkCount*30),0.08,'square',0.22); shake=Math.max(shake,7); }
    pixelBurst(o.cx,o.cy,o.color,Math.min(o.maxHp||1,10)); floatText(o.cx,o.cy-12,'+'+pts,o.color,14);   // PERF: Partikel beim Kill gedeckelt (zähe Gegner spammten viele)
    sfxKill(); flash=Math.min(0.5,flash+0.12); flashColor=o.color; vibe(o.maxHp>=3?[18,14]:6);
    for(const sid of activeSyn) synCharge[sid]=Math.min(1,(synCharge[sid]||0)+1/16);   // ÜBERLADUNG lädt über Kills (voll = aktiver Fusions-Skill bereit)
    shake=Math.max(shake,o.maxHp>=3?6:3); director=Math.min(1,director+0.008);
    // Power-Up-Drop: Grundchance, von Glück (mods.powerupRate) skaliert, größere Gegner droppen eher
    if(Math.random() < 0.06*(mods.powerupRate||1)*((o.maxHp||1)>=3?1.8:1)) dropPowerup(o.cx,o.cy);
    // Seltener Skillpunkt-Drop (von Glück skaliert, Panzer droppen leicht eher) → kleines Glücksgefühl
    if(Math.random() < 0.0012*(mods.powerupRate||1)*((o.maxHp||1)>=3?1.5:1)) grantRandomSP(o.cx,o.cy);   // sichtbarer Skillpunkt-Drop (deutlich seltener)
    dropLoot(o.cx,o.cy,o.elite?'elite':'normal');   // Beute-Drop (Phase 2): Elites = Hauptquelle, normale Gegner selten
    if(o.burnSpread){ for(const n of obstacles){ if(n===o) continue; const dx=n.cx-o.cx,dy=n.cy-o.cy;  // FLÄCHENBRAND
      if(dx*dx+dy*dy<92*92){ n.burn=Math.max(n.burn||0,1.6); n.burnDmg=Math.max(n.burnDmg||0,(o.burnDmg||0.8)*0.8); n.burnSpread=true; } } } }
  // Lenkrakete: dreht sich zum nächsten Ziel und beschleunigt
  function steerMissile(b,dt){ let tx=null,ty=null,bd=1e9;
    for(const o of obstacles){ const dx=o.cx-b.x,dy=o.cy-b.y,d=dx*dx+dy*dy; if(d<bd){bd=d;tx=o.cx;ty=o.cy;} }
    if(boss&&!boss.dead&&!boss.fleeing){ const dx=boss.x-b.x,dy=boss.y-b.y,d=dx*dx+dy*dy; if(d<bd){bd=d;tx=boss.x;ty=boss.y;} }
    let spd=Math.hypot(b.vx,b.vy)||340; spd=Math.min(560,spd+520*dt);
    if(tx!==null){ const desired=Math.atan2(ty-b.y,tx-b.x), cur=Math.atan2(b.vy,b.vx);
      let dA=((desired-cur+Math.PI*3)%(Math.PI*2))-Math.PI; dA=Math.max(-3.4*dt,Math.min(3.4*dt,dA));
      const na=cur+dA; b.vx=Math.cos(na)*spd; b.vy=Math.sin(na)*spd; }
    else { const m=Math.hypot(b.vx,b.vy)||1; b.vx=b.vx/m*spd; b.vy=b.vy/m*spd; } }
  // Rakete explodiert: AoE-Schaden an allen Zielen im Radius (+ Splitter/Napalm/Eisbombe)
  function explodeMissile(b){ const R=b.aoe||64; const h=rollHit(b.dmg), edmg=h.dmg;
    pixelBurst(b.x,b.y,h.crit?'#ff3b3b':'#ff9a2e',6); spawnParticles(b.x,b.y,'#ffe600',16,300); floatDamage(b.x,b.y,edmg,h.crit);
    flash=Math.min(0.5,flash+0.14); flashColor='#ff9a2e'; shake=Math.max(shake,6); beep(140,0.16,'sawtooth',0.3,-60); vibe([18,12]);
    for(let k=obstacles.length-1;k>=0;k--){ const o=obstacles[k]; const dx=o.cx-b.x,dy=o.cy-b.y;
      if(dx*dx+dy*dy<R*R){ o.hp-=edmg; o.hitFlash=0.12;
        if(b.incendiary||syn.napalm){ o.burn=Math.max(o.burn||0,3.0); o.burnDmg=Math.max(o.burnDmg||0,1.4*(mods.wDmgMult||1)); }  // Brandsatz / NAPALM
        if(syn.icebomb){ applySlow(o,2.2,0.32); }                 // EISBOMBE
        if(o.hp<=0){ killObstacle(o); obstacles.splice(k,1); } } }
    if(syn.novabomb) synNovas.push({x:b.x,y:b.y});                  // NOVA-BOMBE: Explosion löst zusätzlich eine Nova aus
    if(syn.clusterarc && wpn.chain) chainLightning(b.x,b.y,wpn.chain.dmg*0.9,wpn.chain.jumps,{});   // CLUSTER-BOGEN: Explosion startet Kettenblitz
    if(b.shrapnel){ for(let i=0;i<8;i++){ const a=i/8*6.28; bullets.push({x:b.x,y:b.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,r:3,dmg:b.dmg*0.4,pierce:0,col:'#ffd36b',life:0.5,frag:true}); } } // Splittergranate
    if(boss&&!boss.dead&&!boss.fleeing){ const dx=boss.x-b.x,dy=boss.y-b.y; if(dx*dx+dy*dy<(R+boss.r)*(R+boss.r)){ boss.hp-=edmg*2; boss.hitFlash=0.07; floatDamage(boss.x,boss.y-boss.r*0.5,edmg*2,h.crit); if(boss.hp<=0) startBossDeath(); } } }
  // Splitterbruch: gefrorenes Ziel zerspringt beim Tod → Scherben-AoE
  function shatterBurst(x,y,dmg){ const R=70; spawnParticles(x,y,'#bdefff',14,260); beep(900,0.06,'square',0.12,-200); shake=Math.max(shake,5);
    for(let k=obstacles.length-1;k>=0;k--){ const o=obstacles[k]; const dx=o.cx-x,dy=o.cy-y;
      if(dx*dx+dy*dy<R*R){ o.hp-=dmg*1.2; o.hitFlash=0.1; if(o.hp<=0){ killObstacle(o); obstacles.splice(k,1); } } } }
  // Kleiner AoE-Puls (Entladung-Fork des Kettenblitzes)
  function chainAoe(x,y,dmg){ const R=46; for(let k=obstacles.length-1;k>=0;k--){ const o=obstacles[k]; const dx=o.cx-x,dy=o.cy-y;
      if(dx*dx+dy*dy<R*R){ o.hp-=dmg; o.hitFlash=0.1; if(o.hp<=0){ killObstacle(o); obstacles.splice(k,1); } } } spawnParticles(x,y,'#9be7ff',5,120); }
  // Kettenblitz: springt von Ziel zu Ziel (jumps), +50% an Gefrorenen via SUPRALEITER
  function chainLightning(x,y,dmg,jumps,opts){ opts=opts||{}; let cx=x,cy=y; const used=new Set(opts.skip||[]);
    for(let h=0;h<jumps;h++){ let best=null,bd=185*185; for(const o of obstacles){ if(used.has(o)) continue; const dx=o.cx-cx,dy=o.cy-cy,d=dx*dx+dy*dy; if(d<bd){bd=d;best=o;} }
      if(!best) break; used.add(best); arcParticles(cx,cy,best.cx,best.cy);
      const hh=rollHit(dmg); let dd=hh.dmg; if(syn.super&&best.slow>0) dd*=1.45;
      best.hp-=dd; best.hitFlash=0.1; floatDamage(best.cx,best.cy-best.h*0.4,dd,hh.crit); if(opts.stun) applySlow(best,opts.stun,0.1);   // Stun zentral über applySlow → CC-Sättigung & Elite-Widerstand greifen (kein direktes o.slow)
      if(syn.wildarc){ best.burn=Math.max(best.burn||0,2.2); best.burnDmg=Math.max(best.burnDmg||0,1.3*(mods.wDmgMult||1)); }   // BRAND-BOGEN (je Sprung)
      if(opts.aoe) chainAoe(best.cx,best.cy,dd*0.5);
      const nx=best.cx,ny=best.cy; if(syn.voltspark) synNovas.push({x:nx,y:ny});
      if(best.hp<=0){ killObstacle(best); const ix=obstacles.indexOf(best); if(ix>=0) obstacles.splice(ix,1); }
      cx=nx; cy=ny; } }
  function arcParticles(x1,y1,x2,y2){
    // gezackter Blitz-Bogen: Zwischenpunkte mit seitlichem Versatz → sichtbarer Kettenblitz
    const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len, seg=Math.max(4,Math.min(9,(len/26)|0)), pts=[[x1,y1]];
    for(let i=1;i<seg;i++){ const tt=i/seg, j=(Math.random()-0.5)*Math.min(30,len*0.32); pts.push([x1+dx*tt+nx*j, y1+dy*tt+ny*j]); }
    pts.push([x2,y2]); if(zaps.length>26) zaps.shift(); zaps.push({pts,t:0.15,life:0.15,col:synPartner('chain')?wepCol('chain'):null});   // Cap gegen Effekt-Spike; Fusions-Mix färbt den Bogen
    spawnParticles(x2,y2,'#eaffff',6,150); beep(1100,0.03,'square',0.07,260); }

  function collectPup(p){ sfxPow(); vibe([15,15,15]); spawnParticles(p.x,p.y,PUPINFO[p.type].c,18,240); flash=0.4; flashColor=PUPINFO[p.type].c;
    if(p.type==='shield'){ shields=Math.min(shields+1,5); floatText(p.x,p.y-18,t('pSchild'),'#2effc0',16); }
    else if(p.type==='slow'){ effects.slowmo=Math.min(8,4*mods.slowmoMult); floatText(p.x,p.y-18,t('pSlow'),'#5b9bff',16); coachDyn('pslow','⏱',t('cefSlow'),t('cefSlowd'),'#5b9bff'); }   // CAP: Zeitlupe max 8s (vorher 30×mult → bis ~67s = unverwundbar)
    else if(p.type==='magnet'){ effects.magnet=30; floatText(p.x,p.y-18,t('pMagnet'),'#c45bff',16); coachDyn('pmagnet','🧲',t('cefMag'),t('cefMagd'),'#c45bff'); }
    else if(p.type==='double'){ effects.double=30; floatText(p.x,p.y-18,t('pDouble'),'#ffe600',16); coachDyn('pdouble','✕2',t('cefDbl'),t('cefDbld'),'#ffe600'); }
    else if(p.type==='bomb'){ const bdmg=(difHp()*diffHp)*6; let n=0;   // Explosion: Flächenschaden – kleine Gegner sterben, zähe (volle HP) überleben
      for(let i=obstacles.length-1;i>=0;i--){ const o=obstacles[i]; o.hp-=bdmg; o.hitFlash=0.12; spawnParticles(o.cx,o.cy,o.color,5,200); if(o.hp<=0){ killObstacle(o); obstacles.splice(i,1); n++; } }
      if(novas.length<18) novas.push({x:p.x,y:p.y,r0:14,rMax:Math.max(W,H)*1.1,t:0,life:0.5,col:'#ff9a2e',fill:true});   // sichtbare Schockwelle
      lasers=[]; ebullets=[]; shake=18; flash=0.6; flashColor='#ff9a2e'; vibe([50,30,50]); banner={text:t('boom'),sub:n+t('boomSub'),t:1.6,color:'#ff9a2e'}; floatText(p.x,p.y-18,t('pBomb'),'#ff9a2e',16); coachDyn('pbomb','💣',t('cefBomb'),t('cefBombd'),'#ff9a2e'); }
  }

  // ---------- Shapes ----------
  function rr(x,y,w,h,r){ ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath(); }
  // ---------- Prozedurale Sci-Fi-Kreaturen (sauberer Neon-Vektor-Look, nativ gezeichnet) ----------
  const REG_COLS=['#ff2e88','#ff5ea8','#c45bff'];   // kohärente Signatur-Palette (Pink/Magenta/Violett) statt Regenbogen → weniger visueller Lärm
  function darkHex(h,f){ const n=parseInt(h.slice(1),16); return 'rgb('+Math.round(((n>>16)&255)*f)+','+Math.round(((n>>8)&255)*f)+','+Math.round((n&255)*f)+')'; }   // abgedunkelte Farbe → dezente Konturen
  function rollCreature(o){ const R=Math.random, pk=a=>a[(R()*a.length)|0];   // aspektgerechtes Pixel-Grid (quadratische Pixel statt Stauchung) einmal pro Gegner
    const tr=o.elite?'e':o.flank?'f':o.shielded?'s':o.shooter?'g':'n';
    const lv=level||1, isObj = tr==='n' && R()<0.2, simple = tr==='n' && lv<=2;   // früh (Lvl 1–2): simple Blobs, wenig Vielfalt
    const arche = simple?'blob' : isObj?pk(['crystal','mine','crystal']) : tr==='e'?pk(['heavy','insect','blob']) : tr==='f'?pk(['insect','blob']) : tr==='g'?pk(['drone','blob']) : pk(['blob','insect','drone','blob']);
    const eyeCol=pk(['#ffffff','#19f0ff','#ffe24d','#2effc0','#ff2e88']), accent=pk(['#ffffff','#19f0ff','#ffe24d','#ff2e88','#2effc0','#9be7ff','#ff9a2e']);
    const eyesN=isObj?0:(simple?pk([1,2]):pk([1,2,2,2,3])), mouth=isObj?'none':(simple?pk(['none','grin']):pk(['none','grin','fangs','teeth','o'])), tongue=!simple&&R()<0.3;
    const GH=15, GW=Math.max(11,Math.min(31, Math.round((o.w/Math.max(1,o.h))*GH/2)*2+1));   // ungerade, an Hitbox-Aspekt → quadratische Pixel
    const cx=(GW-1)/2, cy=7, top=2, bot=12;
    const grid=[]; for(let y=0;y<GH;y++) grid.push(new Array(GW).fill(0));
    const set=(x,y,c)=>{ if(x<0||x>=GW||y<0||y>=GH) return; grid[y][x]=c; grid[y][GW-1-x]=c; };   // x-symmetrisch
    const rx=Math.max(2,cx-2-(R()*1.4|0)), ry=4+(R()*1.4|0)+(arche==='heavy'?1:0);
    const inB=(x,y)=>{ const dx=(x-cx)/rx, dy=(y-cy)/ry;
      if(arche==='crystal') return Math.abs(dx)+Math.abs(dy)<=1.04;   // Diamant
      if(arche==='drone') return Math.abs(x-cx)<=rx && y>=top+1 && y<=bot-1 && !((Math.abs(x-cx)===rx)&&(y===top+1||y===bot-1));   // boxig, abgerundete Ecken
      if(arche==='insect') return dx*dx+dy*dy<=1.0 && !((y-top)%4===3 && Math.abs(x-cx)>rx-1);   // segmentiert
      return dx*dx+dy*dy<=1.0; };   // blob/heavy/mine: Ellipse
    for(let y=top;y<=bot;y++) for(let x=0;x<=cx;x++) if(inB(x,y)) set(x,y,1);
    for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){ if(grid[y][x]) continue; if((y>0&&grid[y-1][x]===1)||(y<GH-1&&grid[y+1][x]===1)||(x>0&&grid[y][x-1]===1)||(x<GW-1&&grid[y][x+1]===1)) grid[y][x]=7; }   // dezenter Umriss (Code 7)
    if(arche==='insect'){ for(let y=top+2;y<bot;y+=3){ set(cx-rx-1,y,1); set(cx-rx-2,y,2); } }   // Beinchen
    if(arche==='mine'){ for(let k=0;k<6;k++){ const a=k*1.047; set(cx+Math.round(Math.cos(a)*(rx+1)),cy+Math.round(Math.sin(a)*(ry+1)),4); } }   // Stacheln
    if(!isObj && !simple && R()<0.5){ set(cx-2,top-1,1); set(cx-2,top-2,3); }   // Antenne
    if(!isObj && tr==='e'){ set(cx-2,top-1,2); set(cx-3,top-2,2); }   // Elite-Hörner
    if(!isObj && !simple && (tr==='f'||R()<0.26)){ for(let k=1;k<=2;k++){ set(cx-rx-k,cy-1+k,4); set(cx-rx-k,cy+k,4); } }   // Flügel
    if(!isObj && (tr==='g'||(!simple&&R()<0.12))){ set(cx-1,bot,4); set(cx-1,bot+1,4); set(cx-1,bot+2,2); }   // Kanone (Schütze)
    if(eyesN){ const ey=top+2+(R()*2|0);   // leuchtende Augen + Pupille
      if(eyesN===1){ set(cx,ey,3); set(cx-1,ey,3); set(cx,ey+1,2); }
      else { const ox=2+(R()*1|0); set(cx-ox,ey,3); set(cx-ox,ey+1,2); if(eyesN===3) set(cx,ey-1,3); } }
    if(mouth!=='none'){ const my=top+6+(R()*2|0);   // Mund / Zähne / Zunge
      if(mouth==='grin'){ for(let x=cx-2;x<=cx;x++) set(x,my,2); }
      else if(mouth==='o'){ set(cx,my,2); set(cx,my+1,2); }
      else if(mouth==='teeth'){ for(let x=cx-2;x<=cx;x++){ set(x,my,2); set(x,my+1,5); } }
      else if(mouth==='fangs'){ set(cx-2,my,2); set(cx-1,my,2); set(cx,my,2); set(cx-2,my+1,5); }
      if((mouth==='o'||mouth==='teeth'||mouth==='fangs')&&tongue) set(cx,my+1,6); }
    const gLine=darkHex(o.color,0.45), cp=4, bake=(wm)=>{ const c=document.createElement('canvas'); c.width=GW*cp; c.height=GH*cp; const g=c.getContext('2d');   // PERF: Sprite EINMAL backen statt pro Frame hunderte fillRect
      for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){ const t=grid[y][x]; if(!t) continue; g.fillStyle=wm?((t===2||t===7)?'#0a0010':'#ffffff'):(t===1?o.color:t===2?'#0a0010':t===7?gLine:t===3?eyeCol:t===4?accent:t===5?'#ffffff':'#ff6a8a'); g.fillRect(x*cp,y*cp,cp,cp); } return c; };
    o.spr=bake(false); o.sprW=bake(true); }
  function drawCreature(o,hit){ if(!o.spr) rollCreature(o); const img=hit?o.sprW:o.spr, dw=o.w*1.3, dh=o.h*1.3;   // PERF: 1 drawImage (nearest-neighbor = crisp Pixel)
    ctx.imageSmoothingEnabled=false; ctx.drawImage(img,-dw/2,-dh/2,dw,dh); ctx.imageSmoothingEnabled=true; }
  function fireEnemyShot(o){ if(!player) return; const a=Math.atan2(player.y-o.cy,player.x-o.cx)+rand(-0.05,0.05), spd=145+difficulty*7;   // langsam & telegrafiert = fair dodgebar
    ebullets.push(eb(o.cx,o.cy+o.h*0.32,Math.cos(a)*spd,Math.sin(a)*spd)); spawnParticles(o.cx,o.cy+o.h*0.3,'#ff5ea8',5,170); beep(190,0.06,'square',0.12,-60); }
  function shapePath(sh,w,h){ const hw=w/2,hh=h/2; ctx.beginPath();
    if(sh==='rect'||sh==='long') rr(-hw,-hh,w,h,6);
    else if(sh==='capsule') rr(-hw,-hh,w,h,hh);
    else if(sh==='diamond'){ ctx.moveTo(0,-hh);ctx.lineTo(hw,0);ctx.lineTo(0,hh);ctx.lineTo(-hw,0);ctx.closePath(); }
    else if(sh==='tri'){ ctx.moveTo(0,hh);ctx.lineTo(hw,-hh);ctx.lineTo(-hw,-hh);ctx.closePath(); }
    else if(sh==='hex'){ for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6,x=Math.cos(a)*hw,y=Math.sin(a)*hh; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); }
    else if(sh==='star'){ for(let i=0;i<8;i++){const a=Math.PI/4*i,r=i%2?hw*0.45:hw,x=Math.cos(a)*r,y=Math.sin(a)*r; i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath(); }
  }

  // ---------- Draw ----------
  function draw(){
    const sh=shake*(opt.shake==null?1:opt.shake);
    ctx.save(); if(sh>0) ctx.translate(rand(-sh,sh),rand(-sh,sh));
    lerpBg(bossActive?BOSS_THEME:THEMES[((level||1)-1)%THEMES.length]);
    const g=ctx.createLinearGradient(0,0,0,H);
    const lift=a=>`rgb(${Math.round(a[0]+8)},${Math.round(a[1]+7)},${Math.round(a[2]+12)})`;   // Hintergrund einen Tick heller (Neon-Grid/Sonne bleiben unberührt → Kontrast bleibt)
    g.addColorStop(0,lift(curBg.top)); g.addColorStop(.55,lift(curBg.mid)); g.addColorStop(1,lift(curBg.bot));
    ctx.fillStyle=g; ctx.fillRect(-40,-40,W+80,H+80);
    // Sterne ZUERST (tiefster Hintergrund) → Synthwave-Sonne liegt eine Ebene davor
    const starGlow=(fxQ==null||fxQ>0.7);   // PERF: weicher Stern-Schein (teures shadowBlur, ~25×/Frame) nur bei gutem Frame-Budget
    for(const s of stars){ const tw=0.82+0.18*Math.sin(s.tw); ctx.globalAlpha=Math.min(1,(0.32+s.z*0.72)*tw);
      ctx.fillStyle=s.z>0.62?'#e6dcff':'#c3abff';
      if(s.z>0.74 && starGlow){ ctx.shadowBlur=5*s.z; ctx.shadowColor='#cfc2ff'; ctx.fillRect(s.x,s.y,s.r,s.r); ctx.shadowBlur=0; }
      else ctx.fillRect(s.x,s.y,s.r,s.r); } ctx.globalAlpha=1;
    drawGrid();
    if(state===S.MENU) drawMenuShip();   // nur Hauptmenü: aktuelles Schiff zentral vor der Sonne (im Hintergrund hinter dem Menü)

    if(state===S.PLAY||state===S.OVER||state===S.UPGRADE||state===S.PAUSE){
      // PERF/Bloom: additive Objekt-Glows = Füllrate. gK skaliert die Glow-Größe mit dem Frame-Budget,
      // gGlow schaltet sie unter Last ganz ab (nur Kerne), gFus spart die zweite Fusions-Aura zuerst.
      const gK=Math.min(1,fxQ), gGlow=fxQ>0.5, gFus=fxQ>0.7;
      // Railgun-Schienen (eigene, kurz aufleuchtend)
      if(player) for(const bm of beams){ const a=Math.max(0,bm.t/0.22); ctx.save(); ctx.globalCompositeOperation='lighter';
        const bc=bm.col||'#fff27a';
        if(fxQ>0.6){ const grd=ctx.createLinearGradient(bm.x-bm.w*1.3,0,bm.x+bm.w*1.3,0); grd.addColorStop(0,hexA(bc,0)); grd.addColorStop(.35,hexA(bc,0.5*a)); grd.addColorStop(.5,'rgba(255,255,255,'+(0.9*a)+')'); grd.addColorStop(.65,hexA(bc,0.5*a)); grd.addColorStop(1,hexA(bc,0));
        ctx.fillStyle=grd; ctx.fillRect(bm.x-bm.w*1.3,0,bm.w*2.6,player.y); }
        else { ctx.fillStyle=hexA(bc,0.42*a); ctx.fillRect(bm.x-bm.w*0.8,0,bm.w*1.6,player.y); }   // unter Last: schmaler Flachfüller statt teurem Verlauf (Governor)
        ctx.fillStyle='rgba(255,255,255,'+a+')'; ctx.fillRect(bm.x-bm.w*0.28,0,bm.w*0.56,player.y);   // gleißender Kern
        ctx.restore(); }
      // Kettenblitz-Bögen (gezackt, glühend)
      for(const z of zaps){ const a=Math.max(0,z.t/z.life); ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.lineCap='round'; ctx.lineJoin='round';
        ctx.beginPath(); ctx.moveTo(z.pts[0][0],z.pts[0][1]); for(let i=1;i<z.pts.length;i++) ctx.lineTo(z.pts[i][0],z.pts[i][1]);
        const zc=z.col||'#78e7ff';
        if(fxQ>0.6){ ctx.strokeStyle=hexA(zc,0.46*a); ctx.lineWidth=12; ctx.stroke(); }           // breites weiches Glühen nur bei Budget (Governor)
        ctx.strokeStyle=hexA(mixCol(zc,'#ffffff',0.45),0.72*a); ctx.lineWidth=5; ctx.stroke();       // mittlere Schicht
        ctx.strokeStyle='rgba(255,255,255,'+a+')'; ctx.lineWidth=2.5; ctx.stroke();                  // heller Kern
        ctx.restore(); }
      // Nova-Schockwellen-Ringe (expandierend, ausblendend)
      for(const nv of novas){ const p=nv.t/nv.life, r=nv.r0+(nv.rMax-nv.r0)*p, a=Math.max(0,1-p); ctx.save(); ctx.globalCompositeOperation='lighter';
        if(fxQ>0.6){ if(nv.fill){ ctx.fillStyle=hexA(nv.col,0.18*a*(1-p)); ctx.beginPath(); ctx.arc(nv.x,nv.y,r,0,6.28); ctx.fill(); }
        ctx.strokeStyle=hexA(nv.col,0.5*a); ctx.lineWidth=12*(1-p*0.6); ctx.beginPath(); ctx.arc(nv.x,nv.y,r,0,6.28); ctx.stroke(); }   // Füllung + breiter Ring nur bei Budget (Governor)
        ctx.strokeStyle=hexA(nv.col,0.9*a); ctx.lineWidth=4.5*(1-p*0.6); ctx.beginPath(); ctx.arc(nv.x,nv.y,r,0,6.28); ctx.stroke();
        ctx.strokeStyle=hexA('#ffffff',0.5*a); ctx.lineWidth=2; ctx.beginPath(); ctx.arc(nv.x,nv.y,r*0.92,0,6.28); ctx.stroke();
        ctx.restore(); }
      // Gibs (fliegende Fetzen mit Schatten – Boss-Splatter)
      for(const g of gibs){ const a=Math.min(1,g.life*1.6); ctx.save(); ctx.translate(g.x,g.y); ctx.rotate(g.rot); ctx.globalAlpha=a;
        ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(-g.size*0.5+1.5,-g.size*0.35+1.5,g.size,g.size*0.7);   // billiger Schatten
        ctx.fillStyle=g.color; ctx.fillRect(-g.size*0.5,-g.size*0.35,g.size,g.size*0.7); ctx.restore(); }
      ctx.globalAlpha=1;
      // lasers
      for(const L of lasers){ ctx.save();
        if(L.state==='warn'){ const a=0.25+0.35*Math.abs(Math.sin(L.t*16)); ctx.globalCompositeOperation='lighter'; ctx.strokeStyle=`rgba(255,230,0,${a})`; ctx.setLineDash([10,10]); ctx.lineWidth=3; ctx.beginPath();
          if(L.orient==='v'){ctx.moveTo(L.pos,0);ctx.lineTo(L.pos,H);}else{ctx.moveTo(0,L.pos);ctx.lineTo(W,L.pos);} ctx.stroke(); }
        else { const fd=1-L.t/L.fireDur;
          if(fxQ>0.6){ const grd=L.orient==='v'?ctx.createLinearGradient(L.pos-L.thick/2,0,L.pos+L.thick/2,0):ctx.createLinearGradient(0,L.pos-L.thick/2,0,L.pos+L.thick/2);
          grd.addColorStop(0,'rgba(255,46,136,0)');grd.addColorStop(.5,`rgba(255,255,255,${0.9*fd})`);grd.addColorStop(1,'rgba(255,46,136,0)'); ctx.fillStyle=grd; }
          else ctx.fillStyle=`rgba(255,120,170,${0.85*fd})`;   // unter Last: flacher Balken statt Verlauf (Governor)
          if(L.orient==='v')ctx.fillRect(L.pos-L.thick/2,0,L.thick,H); else ctx.fillRect(0,L.pos-L.thick/2,W,L.thick); }
        ctx.restore(); }

      // Münzen (1/2/5/10) – Gold-Disc mit aufgedruckter Zahl, Größe nach Wert
      if(coinz&&coinz.length){ const gs=glowSprite('#ffe066');
        for(const c of coinz){ const pr=c.r+Math.sin(c.pulse)*1.4, gr=pr*2.4;
          ctx.globalCompositeOperation='lighter'; ctx.drawImage(gs,c.x-gr,c.y-gr,gr*2,gr*2); ctx.globalCompositeOperation='source-over';
          const g=ctx.createRadialGradient(c.x-pr*0.32,c.y-pr*0.32,1,c.x,c.y,pr); g.addColorStop(0,'#fff7c8'); g.addColorStop(0.55,'#ffd23f'); g.addColorStop(1,'#b8770a');
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(c.x,c.y,pr,0,6.28); ctx.fill();
          ctx.lineWidth=1.6; ctx.strokeStyle='#fff2a8'; ctx.stroke();
          ctx.fillStyle='#7a4f00'; ctx.font='900 '+Math.round(pr*1.15)+'px Orbitron, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(c.val,c.x,c.y+0.5); }
        ctx.textAlign='start'; ctx.textBaseline='alphabetic'; }

      // power-ups
      for(const p of powerups){ const inf=PUPINFO[p.type], pr=p.r+Math.sin(p.pulse)*2, gr=pr*2.4; ctx.save();
        ctx.globalCompositeOperation='lighter'; ctx.drawImage(glowSprite(inf.c),p.x-gr,p.y-gr,gr*2,gr*2); ctx.globalCompositeOperation='source-over'; // Glow-Sprite statt shadowBlur
        ctx.fillStyle=hexA(inf.c,0.22); ctx.strokeStyle=inf.c; ctx.lineWidth=2.5; ctx.beginPath();ctx.arc(p.x,p.y,pr,0,6.28);ctx.fill();ctx.stroke();
        ctx.fillStyle='#fff'; ctx.font='15px Space Mono, monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(inf.g,p.x,p.y+1); ctx.restore(); }

      ctx.textAlign='start'; ctx.textBaseline='alphabetic';

      // sammel-symbole (rotierende raute): gold=Chips, cyan=Heilung, pink=Fluch
      for(const g of gems){ const pr=g.r+Math.sin(g.pulse)*2, col=g.curse?(CURSE_COL[g.u.id]||'#ff2e88'):(GEM_COL[g.kind]||'#ffe600'), gr=pr*2.4; ctx.save(); ctx.translate(g.x,g.y);
        ctx.globalCompositeOperation='lighter'; ctx.drawImage(glowSprite(col),-gr,-gr,gr*2,gr*2); ctx.globalCompositeOperation='source-over'; // Glow-Sprite statt shadowBlur
        ctx.rotate(g.rot); ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.fillStyle=hexA(col,0.18);
        ctx.beginPath(); ctx.moveTo(0,-pr); ctx.lineTo(pr,0); ctx.lineTo(0,pr); ctx.lineTo(-pr,0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.rotate(-g.rot); ctx.fillStyle='#fff'; ctx.font='15px Space Mono, monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(g.curse?g.u.ico:GEM_ICO[g.kind],0,1); ctx.restore(); }

      // Beute-Drops (Phase 2): SAMMELBAR → einheitlicher pulsierender Sammel-Halo (klar von Gegnern unterscheidbar). Waffen-Kiste=Quadrat/🔫, Affix-Kern=Sechseck/✦
      if(loot) for(const L of loot){ const it=L.it, pr=L.r+Math.sin(L.pulse)*2.2, col=it.col, gr=pr*2.6; ctx.save(); ctx.translate(L.x,L.y);
        ctx.globalCompositeOperation='lighter'; ctx.drawImage(glowSprite(col),-gr,-gr,gr*2,gr*2); ctx.globalCompositeOperation='source-over';
        const hr=pr+5+Math.sin(L.pulse*1.6)*2.2; ctx.strokeStyle='rgba(255,255,255,'+(0.5+0.25*Math.sin(L.pulse*1.6))+')'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(0,0,hr,0,6.28); ctx.stroke();   // Sammel-Halo = „einfliegen zum Aufsammeln"
        ctx.rotate(L.rot); ctx.strokeStyle=col; ctx.lineWidth=2.6; ctx.fillStyle=hexA(col,0.20);
        if(it.wep){ const s=pr*0.92; ctx.beginPath(); ctx.rect(-s,-s,s*2,s*2); ctx.fill(); ctx.stroke(); }   // Waffen-Kiste = Quadrat
        else { ctx.beginPath(); for(let k=0;k<6;k++){ const a=k/6*6.283; const px=Math.cos(a)*pr,py=Math.sin(a)*pr; if(k) ctx.lineTo(px,py); else ctx.moveTo(px,py); } ctx.closePath(); ctx.fill(); ctx.stroke(); }   // Affix-Kern = Sechseck
        ctx.rotate(-L.rot); ctx.fillStyle='#fff'; ctx.font=(it.wep?'15px Space Mono, monospace':'900 13px Orbitron, sans-serif'); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(it.wep?'🔫':'✦',0,1); ctx.restore(); }

      // Skillpunkt-Drops: leuchtende cyan Raute (💠) mit hellem Kern + Funkeln
      for(const s of sps){ const pr=s.r+Math.sin(s.pulse)*2, col='#19f0ff', gr=pr*2.9; ctx.save(); ctx.translate(s.x,s.y);
        ctx.globalCompositeOperation='lighter'; ctx.drawImage(glowSprite(col),-gr,-gr,gr*2,gr*2); ctx.globalCompositeOperation='source-over';
        ctx.rotate(s.rot);
        ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.fillStyle='rgba(25,240,255,0.22)';
        ctx.beginPath(); ctx.moveTo(0,-pr); ctx.lineTo(pr*0.82,0); ctx.lineTo(0,pr); ctx.lineTo(-pr*0.82,0); ctx.closePath(); ctx.fill(); ctx.stroke();
        const ip=pr*0.5; ctx.fillStyle='#bdf6ff'; ctx.beginPath(); ctx.moveTo(0,-ip); ctx.lineTo(ip*0.82,0); ctx.lineTo(0,ip); ctx.lineTo(-ip*0.82,0); ctx.closePath(); ctx.fill();
        ctx.restore();
        const tw=0.45+0.55*Math.abs(Math.sin(s.pulse)), sk=pr*1.6; ctx.save(); ctx.globalCompositeOperation='lighter';
        ctx.strokeStyle='rgba(220,250,255,'+tw+')'; ctx.lineWidth=1.4;
        ctx.beginPath(); ctx.moveTo(s.x-sk,s.y); ctx.lineTo(s.x+sk,s.y); ctx.moveTo(s.x,s.y-sk); ctx.lineTo(s.x,s.y+sk); ctx.stroke(); ctx.restore(); }

      // obstacles
      for(const o of obstacles){
        if(o.chest){ const fr=Math.max(0,o.hp/o.maxHp), s=o.w*0.5, hit=o.hitFlash>0; ctx.save(); ctx.translate(o.cx,o.cy);   // Beute-Truhe = goldene Kiste zum KAPUTTSCHIESSEN (HP-Leiste + Risse, kein Sammel-Halo)
          ctx.globalCompositeOperation='lighter'; ctx.drawImage(glowSprite('#ffd23f'),-o.w,-o.w,o.w*2,o.w*2); ctx.globalCompositeOperation='source-over';
          ctx.strokeStyle=hit?'#fff':'#ffd23f'; ctx.lineWidth=3.2; ctx.fillStyle=hexA('#ffd23f',hit?0.4:0.18); ctx.beginPath(); ctx.rect(-s,-s,s*2,s*2); ctx.fill(); ctx.stroke();
          ctx.strokeStyle=hexA('#fff7d6',0.6); ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(-s,-s*0.12); ctx.lineTo(s,-s*0.12); ctx.stroke();   // Deckel-Linie
          ctx.fillStyle='#fff'; ctx.font='20px Space Mono, monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('📦',0,2);
          if(fr<0.66){ ctx.strokeStyle='#fff7d6'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(-s*0.35,-s); ctx.lineTo(0,0); ctx.lineTo(-s*0.12,s); if(fr<0.33){ ctx.moveTo(s*0.32,-s); ctx.lineTo(s*0.05,0); ctx.lineTo(s*0.22,s); } ctx.stroke(); }   // Risse je nach Schaden
          ctx.restore();
          ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(o.cx-s,o.cy-s-9,s*2,4); ctx.fillStyle='#ffd23f'; ctx.fillRect(o.cx-s,o.cy-s-9,s*2*fr,4);   // HP-Leiste
          continue; }
        if(o.pattern!=='straight'&&o.trail.length){ for(let i=0;i<o.trail.length;i++){ const t=o.trail[i],a=i/o.trail.length;
          ctx.globalAlpha=a*0.28; ctx.fillStyle=o.color; ctx.beginPath(); ctx.arc(t.x,t.y,o.w*0.18*a,0,6.28); ctx.fill(); } ctx.globalAlpha=1; }
        ctx.save(); ctx.translate(o.cx,o.cy); ctx.rotate(o.rot||0);
        const burning=o.burn>0, frozen=o.slow>0, el=elapsed||0;
        const glowCol=burning?(Math.sin(el*34+o.cx)>0?'#ff5a1a':'#ffd24d'):(frozen?'#8fe8ff':o.color);
        const gr=Math.max(o.w,o.h)*(burning?(1.18+Math.sin(el*30+o.cy)*0.16):(frozen?0.95:0.85))*gK;   // brennend: pulsierender Feuerschein · gK: Glow mit Budget skalieren
        ctx.globalCompositeOperation='lighter'; ctx.drawImage(glowSprite(glowCol),-gr,-gr,gr*2,gr*2); ctx.globalCompositeOperation='source-over';
        const oc=(o.hitFlash>0)?'#ffffff':(frozen?'#bdefff':o.color);
        if(o.shape==='ring'){ ctx.strokeStyle=oc; ctx.lineWidth=o.w*0.26; ctx.beginPath(); ctx.arc(0,0,o.w*0.4,0,6.28); ctx.stroke(); }
        else if(o.mob){ ctx.save(); ctx.rotate(-(o.rot||0)); drawCreature(o,o.hitFlash>0,frozen);   // Mob = prozedurales Pixel-Monster (aufrecht)
          if(o.shooter && o.fireT!=null){ const ch=Math.max(0,1-o.fireT/0.5); if(ch>0){ ctx.globalCompositeOperation='lighter'; ctx.fillStyle=hexA('#ff2e88',ch*0.8); ctx.beginPath(); ctx.arc(0,o.h*0.5,o.w*0.2*(0.6+ch*0.6),0,6.28); ctx.fill(); ctx.globalCompositeOperation='source-over'; } }   // Schützen-Telegraph
          ctx.restore(); }
        else { ctx.fillStyle=hexA(o.color,o.hitFlash>0?0.5:0.18); ctx.strokeStyle=oc; ctx.lineWidth=o.elite?4:2.6; shapePath(o.shape,o.w,o.h); ctx.fill(); ctx.stroke();   // PERF: flacher Fill + Rand (kein Gradient pro Frame mehr)
          if(fxQ>0.7){ ctx.strokeStyle=hexA('#ffffff',o.hitFlash>0?0.5:0.16); ctx.lineWidth=1.1; shapePath(o.shape,o.w*0.6,o.h*0.6); ctx.stroke(); } }   // dezenter innerer Schimmer nur bei FX-Budget
        if(frozen){ const op=Math.min(0.7,0.32+(1-(o.slowAmt!=null?o.slowAmt:1))*0.7);   // tiefer gefroren = dichtere Eiskruste
          ctx.globalAlpha=op; ctx.strokeStyle='#eaffff'; ctx.lineWidth=2; ctx.setLineDash([4,3]);
          if(o.shape==='ring'){ ctx.beginPath(); ctx.arc(0,0,o.w*0.46,0,6.28); ctx.stroke(); } else { shapePath(o.shape,o.w*1.14,o.h*1.14); ctx.stroke(); }
          ctx.setLineDash([]); ctx.globalAlpha=1; }
        if(o.elite){ const er=Math.max(o.w,o.h)*0.62, pw=1+Math.sin((elapsed||0)*6)*0.18;   // Panzer-Telegraph: pulsierender Achteck-Schild
          ctx.strokeStyle=o.hitFlash>0?'#ffffff':'#e6b3ff'; ctx.lineWidth=2.4*pw;
          ctx.beginPath(); for(let k=0;k<8;k++){ const a=k/8*6.28, px=Math.cos(a)*er, py=Math.sin(a)*er; k?ctx.lineTo(px,py):ctx.moveTo(px,py); } ctx.closePath(); ctx.stroke(); }
        if(o.shielded && o.shield>0){ const sr=Math.max(o.w,o.h)*0.66; ctx.globalAlpha=Math.min(1,0.32+0.5*(o.shield/(o.shieldMax||1))); ctx.strokeStyle=o.hitFlash>0?'#ffffff':'#2effc0'; ctx.lineWidth=2.6; ctx.beginPath(); ctx.arc(0,0,sr,0,6.28); ctx.stroke(); ctx.globalAlpha=1; }   // Schild-Ring (verblasst mit Restschild)
        ctx.restore();
        // Mini-HP-Balken über angeschlagenen Gegnern (macht Zähigkeit & Schaden lesbar)
        if(o.hp<o.maxHp-0.01 && o.maxHp>1){ const bw=Math.max(18,o.w*0.7), bx=o.cx-bw/2, by=o.cy-o.h*0.5-9, f=Math.max(0,o.hp/o.maxHp);
          ctx.shadowBlur=0; ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(bx-1,by-1,bw+2,4);
          ctx.fillStyle=f>0.5?'#7cff2e':(f>0.25?'#ffe600':'#ff3b3b'); ctx.fillRect(bx,by,bw*f,2); }
      }

      // bolzen (neon-laser, skin-farbig) & raketen — Glow via Sprite statt shadowBlur (gK/gGlow s. oben)
      ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
      for(const b of bullets){
        if(b.homing){ const gr=b.r*4.5*gK; if(gGlow) ctx.drawImage(glowSprite(b.col2||'#ff8a2e'),b.x-gr,b.y-gr,gr*2,gr*2);
          ctx.fillStyle='#ff6a00'; ctx.beginPath(); ctx.arc(b.x-b.vx*0.012,b.y-b.vy*0.012,b.r*0.8,0,6.28); ctx.fill();
          ctx.fillStyle='#ffd36b'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,6.28); ctx.fill();
          ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*0.4,0,6.28); ctx.fill(); }
        else { const gr=b.r*3.4*gK; if(b.col2 && gFus){ const g2=b.r*5*gK; ctx.drawImage(glowSprite(b.col2),b.x-g2,b.y-g2,g2*2,g2*2); }   // Fusions-Aura nur bei Budget
          if(gGlow) ctx.drawImage(glowSprite(b.col||'#19f0ff'),b.x-gr,b.y-gr,gr*2,gr*2);
          ctx.strokeStyle=b.col||'#caffff'; ctx.lineWidth=b.r;
          ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(b.x-b.vx*0.022,b.y-b.vy*0.022); ctx.stroke();
          ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*0.5,0,6.28); ctx.fill(); } }
      ctx.globalCompositeOperation='source-over';

      // mega-boss + gegner-kugeln
      if(boss) drawBoss();
      if(ebullets.length){
        // Glow (additive drawImage) nur bei moderater Kugelzahl + Budget – bei dichten Mega-Salven sofort weglassen (Fillrate-Schutz, der Governor reagiert zu träge)
        if(gGlow && ebullets.length<=120){ const gs=glowSprite('#ff2e88'); ctx.globalCompositeOperation='lighter';
          for(const e of ebullets){ const gr=e.r*2.8*gK; ctx.drawImage(gs,e.x-gr,e.y-gr,gr*2,gr*2); }
          ctx.globalCompositeOperation='source-over'; }
        for(const e of ebullets){ ctx.fillStyle='#ff5ea8'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,6.28); ctx.fill();
          ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(e.x,e.y,e.r*0.4,0,6.28); ctx.fill(); } }

      // player trail
      const tcol=comboColor(multiplier||1);   // Trail glüht in der Combo-Hitze-Farbe (visuelles „on fire")
      for(let i=0;i<player.trail.length;i++){ const t=player.trail[i],a=i/player.trail.length; ctx.globalAlpha=a*0.5; ctx.fillStyle=tcol; ctx.beginPath(); ctx.arc(t.x,t.y,player.r*a*0.8,0,6.28); ctx.fill(); } ctx.globalAlpha=1;

      // player (mitwachsendes Pixel-Raumschiff)
      if(state===S.PLAY||state===S.UPGRADE||state===S.PAUSE){ const blink=invuln>0&&jumping<=0&&Math.floor(invuln*16)%2===0;
        if(!blink) drawShip();
      }

      // particles (additiv -> Funkenregen leuchtet übereinander). Glow via Halo+Kern statt teurem shadowBlur (mobil flüssig)
      ctx.globalCompositeOperation='lighter'; ctx.shadowBlur=0;
      const pHalo=pAlive<140 && fxQ>0.7 && !_lowfx;   // Halo nur bei wenigen Partikeln & gutem Frame-Budget; bei Last nur Kern = halbe Füllkosten
      let _pc=null;   // PERF: Burst-Partikel liegen im Ring zusammenhängend & teilen die Farbe → redundante fillStyle-Statewechsel sparen
      for(const p of particles){ if(p.life<=0) continue; const a=p.life, s=p.size;
        if(p.color!==_pc){ ctx.fillStyle=_pc=p.color; }
        if(pHalo){ ctx.globalAlpha=a*0.35; ctx.fillRect(p.x-s,p.y-s,s*2,s*2); }     // weicher additiver Halo
        ctx.globalAlpha=a;      ctx.fillRect(p.x-s/2,p.y-s/2,s,s); }               // heller Kern
      ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';

      // floaters
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.shadowBlur=0;
      for(const f of floaters){ const a=Math.max(0,f.life); ctx.font='700 '+f.size+'px Orbitron, sans-serif';
        ctx.globalAlpha=a*0.5; ctx.fillStyle='#000'; ctx.fillText(f.text,f.x+1.5,f.y+1.5);     // billiger Schlagschatten (kein Blur) für Kontrast
        ctx.globalAlpha=a;     ctx.fillStyle=f.color; ctx.fillText(f.text,f.x,f.y); } ctx.globalAlpha=1;

      // Effekt-Timer jetzt im DOM-HUD oben (renderFxbar), Leben/Schild/Waffen unten (renderCockpit)

      // banner (unterdrückt während des Boss-Auftritts → das VS-Intro übernimmt)
      if(banner && bossIntroT<=0){ const a=Math.min(1,banner.t*1.2); ctx.save(); ctx.globalAlpha=a; ctx.textAlign='center';
        ctx.font='900 clamp(22px,6vw,40px) Orbitron, sans-serif'; ctx.shadowBlur=24; ctx.shadowColor=banner.color; ctx.fillStyle='#fff'; ctx.fillText(banner.text,W/2,H*0.32);
        if(banner.sub){ ctx.font='700 clamp(13px,3vw,18px) Orbitron, sans-serif'; ctx.fillStyle=banner.color; ctx.fillText(banner.sub,W/2,H*0.32+34); } ctx.restore(); }
      if(bossIntroT>0) drawBossIntro();
      // Coach-Karte: animierte Tutorial-Einblendung unten-mittig — friert das Spiel ein, bis getippt wird
      if(coachCard && (state===S.PLAY||state===S.PAUSE)){ const C=coachCard;
        const a=Math.max(0,Math.min(1,C.closing?1-C.ct:C.app));
        const cw=Math.min(420,W*0.9), cx=(W-cw)/2, padL=74, maxW=cw-padL-16;
        ctx.save(); ctx.textBaseline='alphabetic'; ctx.font='600 12.5px Orbitron, sans-serif';
        const words=(C.desc||'').split(' '); let line='', lines=[];
        for(const w of words){ const tst=line?line+' '+w:w; if(ctx.measureText(tst).width>maxW && line){ lines.push(line); line=w; } else line=tst; } if(line) lines.push(line);
        const core=LESSON_ORDER.indexOf(C.sk)>=0, tapH=coachPause?38:0;   // Fortschrittsleiste nur Kern-Lektionen · Platz für den WEITER-Button
        const ch=Math.max(92,40+lines.length*16+(core?24:12)+tapH), cy=H*0.72+(1-C.app)*26;   // Hochgleiten via app (auch im Freeze)
        ctx.globalAlpha=a;
        ctx.beginPath(); rr(cx,cy,cw,ch,16); ctx.fillStyle='rgba(10,3,24,0.95)'; ctx.shadowBlur=26; ctx.shadowColor=C.col; ctx.fill(); ctx.shadowBlur=0;
        ctx.lineWidth=2; ctx.strokeStyle=C.col; ctx.globalAlpha=a*(0.55+0.45*Math.abs(Math.sin(performance.now()*0.003))); ctx.beginPath(); rr(cx,cy,cw,ch,16); ctx.stroke(); ctx.globalAlpha=a;   // pulsierender Rand (läuft auch im Freeze)
        ctx.fillStyle=C.col; ctx.beginPath(); rr(cx+2,cy+8,5,ch-16,2.5); ctx.fill();   // Akzentbalken links
        ctx.textAlign='center'; ctx.font='32px sans-serif'; ctx.fillStyle='#fff'; ctx.fillText(C.ico,cx+40,cy+44);
        const tx=cx+padL;
        if(core){ const dn=LESSON_ORDER.filter(k=>meta.seen&&meta.seen[k]).length, dtot=LESSON_ORDER.length;
          ctx.textAlign='right'; ctx.font='800 11px Orbitron, sans-serif'; ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillText('📚 '+dn+'/'+dtot,cx+cw-14,cy+27);
          const bw2=cx+cw-14-tx, by2=cy+ch-13-tapH; ctx.fillStyle='rgba(255,255,255,0.14)'; ctx.beginPath(); rr(tx,by2,bw2,4,2); ctx.fill();
          ctx.fillStyle=C.col; ctx.beginPath(); rr(tx,by2,Math.max(4,bw2*dn/dtot),4,2); ctx.fill(); }
        ctx.textAlign='left'; ctx.font='900 16px Orbitron, sans-serif'; ctx.fillStyle=C.col; ctx.fillText(C.title,tx,cy+28);
        ctx.font='600 12.5px Orbitron, sans-serif'; ctx.fillStyle='rgba(255,255,255,0.92)';
        let ly=cy+47; for(const ln of lines){ ctx.fillText(ln,tx,ly); ly+=16; }
        if(coachPause){ const bw=Math.min(cw-36,160), bh=28, bx=cx+(cw-bw)/2, by=cy+ch-bh-8, pulse=0.78+0.22*Math.abs(Math.sin(performance.now()*0.005));   // WEITER-Button (nur er schließt die Karte)
          ctx.beginPath(); rr(bx,by,bw,bh,14); ctx.globalAlpha=a*pulse; ctx.fillStyle=C.col; ctx.fill(); ctx.globalAlpha=a;
          ctx.fillStyle='#08010f'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='800 13px Orbitron, sans-serif'; ctx.fillText(t('skillNext'),bx+bw/2,by+bh/2+1); ctx.textBaseline='alphabetic';
          coachBtn={x:bx,y:by,w:bw,h:bh}; } else coachBtn=null;
        ctx.restore(); }
      drawJumpReady();
    }

    // vignette (action / combo / near)
    const vig=0.2+Math.min(0.26,(multiplier||1)*0.02)+(nearGlow||0)*0.25;   // Grund-Vignette zurückgenommen (Spiel wirkte insgesamt zu dunkel)
    const rg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.72);
    rg.addColorStop(0,'rgba(0,0,0,0)'); rg.addColorStop(1,`rgba(${bossActive?'40,5,5':'10,0,20'},${vig})`); ctx.fillStyle=rg; ctx.fillRect(-40,-40,W+80,H+80);
    if(effects&&effects.slowmo>0){ ctx.fillStyle='rgba(40,80,160,0.10)'; ctx.fillRect(-40,-40,W+80,H+80); }
    // Fluch „Drip aber blind": Sicht-Tunnel um den Spieler
    if(mods&&mods.fog>0.004&&player&&(state===S.PLAY||state===S.PAUSE||state===S.UPGRADE)){
      const fn=Math.min(1,mods.fog/0.82), outerR=Math.max(W,H)*(0.62-0.18*fn);   // je dichter der Nebel, desto enger schließt die Dunkelheit von außen
      const fr=ctx.createRadialGradient(player.x,player.y,player.r*2.4,player.x,player.y,outerR);
      fr.addColorStop(0,'rgba(4,1,10,0)'); fr.addColorStop(1,`rgba(4,1,10,${Math.min(0.82,mods.fog)})`); ctx.fillStyle=fr; ctx.fillRect(-40,-40,W+80,H+80);
      const ta=Math.min(0.72,mods.fog*0.85); const tg=ctx.createLinearGradient(0,0,0,H*0.5);   // oben zusätzlich abdunkeln (stärkere Vignette nach oben)
      tg.addColorStop(0,`rgba(4,1,10,${ta})`); tg.addColorStop(1,'rgba(4,1,10,0)'); ctx.fillStyle=tg; ctx.fillRect(0,0,W,H*0.5); }
    // Combo-Overdrive: pulsierender Chroma-Schimmer
    if(overdrive&&opt.fx){ const hue=(elapsed||0)*0.7,
      r=Math.floor(128+127*Math.sin(hue)),g2=Math.floor(128+127*Math.sin(hue+2.09)),b=Math.floor(128+127*Math.sin(hue+4.19));
      ctx.fillStyle=`rgba(${r},${g2},${b},${0.05+0.03*(beatPulse||0)})`; ctx.fillRect(-40,-40,W+80,H+80); }
    if(flash>0&&opt.fx){ const m=flashColor.startsWith('#')?hexA(flashColor,flash*0.13):flashColor; ctx.fillStyle=m; ctx.fillRect(-40,-40,W+80,H+80); }   // sanfter (0.2→0.13): weniger Screen-Flash-Lärm
    if(deathFlash>0){ ctx.fillStyle=hexA('#ffffff',Math.min(0.96,deathFlash)); ctx.fillRect(-40,-40,W+80,H+80);   // Nuklearblitz (bildfüllend)
      if(deathFlash<0.7){ ctx.fillStyle=hexA(deathGlow,Math.min(0.42,0.7-deathFlash)); ctx.fillRect(-40,-40,W+80,H+80); } }   // glühender Schein im Abklang (Varianten-Farbe)
    // 😈 Loser-Materialisierung: nach der Explosion fügt sich der Verlierer wieder zusammen
    if(state===S.OVER && deathT>0.5 && opt.fx){ const rev=Math.min(1,(deathT-0.55)/0.55), x=deathX, y=deathY, R=24;
      ctx.save();
      ctx.globalCompositeOperation='lighter';   // einlaufender Glitch-Ring
      for(let i=0;i<16;i++){ const a=i/16*6.28+deathT*2.2, rr=R+(1-rev)*80; ctx.globalAlpha=rev*0.6; ctx.fillStyle=i%2?'#ff2e88':deathGlow;
        ctx.fillRect(x+Math.cos(a)*rr-1.6,y+Math.sin(a)*rr-1.6,3.2,3.2); }
      ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=Math.min(1,rev*1.2);
      const jit=(1-rev)*7, cx=x+rand(-jit,jit), cy=y+rand(-jit,jit);   // Glitch-Zittern bis fertig
      const cg=ctx.createRadialGradient(cx,cy,2,cx,cy,R); cg.addColorStop(0,'#cfc4e6'); cg.addColorStop(1,'rgba(120,110,140,0)');
      ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(cx,cy,R,0,6.28); ctx.fill();
      ctx.font='900 '+Math.round(R*1.35)+'px Orbitron,monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(rev>0.92?'😈':'💀',cx,cy);
      // schadenfrohe Spott-Nachricht materialisiert sich
      if(rev>0.45 && deathMsg && !overShown){ ctx.globalAlpha=Math.min(1,(rev-0.45)/0.4); const gj=(1-rev)*5;   // sobald das Over-Panel da ist: kein doppelter Spott mehr auf dem Canvas (Geist-Duplikat weg)
        ctx.font='900 21px Orbitron,sans-serif'; ctx.textBaseline='middle';
        const maxW=W*0.84, words=deathMsg.split(' '); let line='', lines=[];
        for(const w of words){ const tst=line?line+' '+w:w; if(ctx.measureText(tst).width>maxW && line){ lines.push(line); line=w; } else line=tst; } if(line) lines.push(line);
        const lh=26, blockH=lines.length*lh; let sy=y-R-18-blockH+lh/2; if(sy<40+lh/2) sy=y+R+24+lh/2;   // über dem Kern, sonst darunter
        ctx.lineWidth=4; ctx.strokeStyle='rgba(8,2,18,0.85)';
        lines.forEach((ln,k)=>{ const tx=W/2+rand(-gj,gj), ty=sy+k*lh+rand(-gj,gj); ctx.strokeText(ln,tx,ty); ctx.fillStyle='#ff2e88'; ctx.fillText(ln,tx,ty); }); }
      ctx.globalAlpha=1; ctx.textAlign='start'; ctx.textBaseline='alphabetic'; ctx.restore(); }
    // Wahnsinn-Modus: dezenter, ruhiger „Sync-Verlust"-Roll statt flackernder Zufalls-Scanlines.
    // Zeitgesteuert (kein Flackern → augenschonend) und nur ~2 Draws/Frame (kein Perf-Hit). Abschaltbar via opt.madnessFx.
    if(endless&&opt.fx&&opt.madnessFx!==false){ const m=Math.min(1,madness), tt=elapsed||0;
      ctx.save(); ctx.globalCompositeOperation='lighter';
      const ry=((tt*0.16)%1)*(H+160)-80, band=24+42*m;        // langsam nach unten wandernder Streifen (wie alter CRT-Bildlauf)
      const g=ctx.createLinearGradient(0,ry,0,ry+band);
      g.addColorStop(0,'rgba(255,46,136,0)'); g.addColorStop(0.5,`rgba(255,46,136,${0.05+0.06*m})`); g.addColorStop(1,'rgba(25,240,255,0)');
      ctx.fillStyle=g; ctx.fillRect(-40,ry,W+80,band);
      ctx.fillStyle=`rgba(25,240,255,${0.05+0.07*m})`; ctx.fillRect(-40,ry-3,W+80,1);   // dünner Versatz-Strich → Glitch-Anmutung, aber ruhig
      ctx.restore(); }
    // Debug-Overlay des DDA-Reglers – nur Entwicklung/Feintuning, im fertigen Spiel nicht erreichbar (opt.dbg manuell in der Konsole setzen)
    if(opt.dbg && (state===S.PLAY||state===S.PAUSE)){ ctx.save(); ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(6,52,182,58);
      ctx.fillStyle='#7fffd4'; ctx.font='11px Space Mono, monospace'; ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText('DDA flowI '+flowI.toFixed(2)+(flowI>1.02?' UP':(flowI<0.98?' DOWN':' =')),12,58);
      ctx.fillText('director '+director.toFixed(2)+'  bias '+(skillBias>=0?'+':'')+skillBias.toFixed(2),12,74);
      ctx.fillText('hits '+runHits+'  near '+(nearCount||0)+'  dps '+gunDps().toFixed(1),12,90);
      ctx.restore(); }
    ctx.restore();
  }

  const SHIP_ACC=['#ff2e88','#ffe600','#2effc0','#c45bff','#ff9a2e','#7cff2e'];
  const SKINS=[
    {id:'std',  cost:0,   hull:'#16384a',edge:'#19f0ff',acc:'#19f0ff'},
    {id:'pink', cost:300, hull:'#3a0f25',edge:'#ff2e88',acc:'#ff5ea8'},
    {id:'sun',  cost:300, hull:'#3a1f06',edge:'#ff9a2e',acc:'#ffe600'},
    {id:'vapor',cost:600, hull:'#2a0f3a',edge:'#c45bff',acc:'#ff2e88'},
    {id:'toxic',ach:'mega',   hull:'#0f3a1a',edge:'#7cff2e',acc:'#2effc0'},
    {id:'gold', ach:'won',    hull:'#3a3206',edge:'#ffe600',acc:'#fff3a0'},
    {id:'glitch',ach:'madness',hull:'#241a2a',edge:'#ff2e88',acc:'#19f0ff',rnd:true},
    {id:'rainbow',cost:1500,  hull:'#16384a',edge:'#19f0ff',acc:'#19f0ff',rnd:true},
    // Neue Coin-Skins (v364): faire Kosmetik – Coins kaufen Aussehen, nicht Macht
    {id:'ice',    cost:300,  hull:'#0a2a3a',edge:'#7fe8ff',acc:'#ffffff'},
    {id:'mint',   cost:400,  hull:'#0a3a2a',edge:'#2effc0',acc:'#aaffea'},
    {id:'ember',  cost:450,  hull:'#3a1206',edge:'#ff5a1e',acc:'#ffd23f'},
    {id:'aqua',   cost:500,  hull:'#06303a',edge:'#19f0ff',acc:'#7cff2e'},
    {id:'void',   cost:600,  hull:'#140a24',edge:'#7b2eff',acc:'#c45bff'},
    {id:'crimson',cost:700,  hull:'#3a0610',edge:'#ff2e4e',acc:'#ff8aa0'},
    {id:'mono',   cost:800,  hull:'#222b33',edge:'#dfeaf2',acc:'#ffffff'},
    {id:'cyber',  cost:900,  hull:'#2a2406',edge:'#ffe600',acc:'#19f0ff'},
    {id:'nebula', cost:1200, hull:'#1a1030',edge:'#ff5ea8',acc:'#7b2eff',rnd:true}
  ];
  const curSkin=()=>SKINS.find(s=>s.id===(meta.skin||'std'))||SKINS[0];
  const SKINTR={
    de:{std:'Standard',pink:'Magenta',sun:'Sonne',vapor:'Vapor',toxic:'Toxisch',gold:'Gold',glitch:'Glitch',rainbow:'Regenbogen',ice:'Eis',mint:'Minze',ember:'Glut',aqua:'Aqua',void:'Leere',crimson:'Karmesin',mono:'Mono',cyber:'Cyber',nebula:'Nebula'},
    en:{std:'Default',pink:'Magenta',sun:'Sun',vapor:'Vapor',toxic:'Toxic',gold:'Gold',glitch:'Glitch',rainbow:'Rainbow',ice:'Ice',mint:'Mint',ember:'Ember',aqua:'Aqua',void:'Void',crimson:'Crimson',mono:'Mono',cyber:'Cyber',nebula:'Nebula'},
    fr:{std:'Défaut',pink:'Magenta',sun:'Soleil',vapor:'Vapor',toxic:'Toxique',gold:'Or',glitch:'Glitch',rainbow:'Arc-en-ciel',ice:'Glace',mint:'Menthe',ember:'Braise',aqua:'Aqua',void:'Vide',crimson:'Cramoisi',mono:'Mono',cyber:'Cyber',nebula:'Nébuleuse'}
  };
  const skinName=id=>((SKINTR[lang]&&SKINTR[lang][id])||SKINTR.en[id]||id);
  const MAXSHIPS=6;
  const shipList=()=>(meta.ships||(meta.ships=[]));
  const activeShip=()=>{ const L=shipList(); return L[meta.shipSlot||0]||L[0]||null; };
  const activeShipCells=()=>{ const s=activeShip(); return (s&&s.cells)||{}; };
  function hasCustomShip(){ const s=activeShip(); return !!(s&&s.cells&&Object.keys(s.cells).length); }
  function buildCustomSprite(r){ return buildSpriteFromCells(activeShipCells(),r); }
  function buildSpriteFromCells(cells,r){ const cp=Math.max(2,Math.round(r*0.31)); cells=cells||{};
    const pad=6*cp, cw=(2*EDHW+1)*cp+pad*2, ch=EDROWS*cp+pad*2, ox=pad+EDHW*cp, oy=pad+((EDROWS-1)/2)*cp;
    const cv=document.createElement('canvas'); cv.width=cw; cv.height=ch; const x=cv.getContext('2d');
    let maxRow=0, bottomMaxX=0, accCount={}, minRow=99, maxCx=0;
    const drawCell=(fx,fy,c,g)=>{ const px=ox+fx*cp, py=oy+(fy-(EDROWS-1)/2)*cp;
      if(g){ x.save(); x.globalCompositeOperation='lighter'; x.globalAlpha=0.55; const gr=cp*1.7; x.drawImage(glowSprite(c),px-gr,py-gr,gr*2,gr*2); x.restore(); }
      x.fillStyle=c; x.fillRect(px-cp/2,py-cp/2,cp,cp); };
    for(const k in cells){ const p=k.split(','), cx=+p[0], cy=+p[1], cell=cells[k], c=(cell&&cell.c)||cell||'#19f0ff', g=cell&&cell.g?1:0;
      drawCell(cx,cy,c,g); if(cx>0) drawCell(-cx,cy,c,g);
      if(cy>maxRow){ maxRow=cy; bottomMaxX=cx; } else if(cy===maxRow && cx>bottomMaxX) bottomMaxX=cx;
      if(cy<minRow) minRow=cy; if(cx>maxCx) maxCx=cx;
      accCount[c]=(accCount[c]||0)+1; }
    let acc='#19f0ff',best=-1; for(const c in accCount){ if(accCount[c]>best){ best=accCount[c]; acc=c; } }   // häufigste Farbe = Triebwerksglow
    const tailY=(maxRow-(EDROWS-1)/2)*cp+cp*0.5, flameX=bottomMaxX>0?[-bottomMaxX*cp*0.6,bottomMaxX*cp*0.6]:[0];
    const cen=(EDROWS-1)/2, bw=(maxCx+0.6)*cp, bh=(Math.max(maxRow-cen,cen-minRow)+0.6)*cp;   // Pixel-Bounds (für Schild-Form)
    // Mündungen = vorderste vorstehende Pixel je Spalte (Spiegel berücksichtigt)
    const colMin=new Map(), see=(fx,fy)=>{ const v=colMin.get(fx); if(v===undefined||fy<v) colMin.set(fx,fy); };
    for(const k in cells){ const p=k.split(','),cx=+p[0],cy=+p[1]; see(cx,cy); if(cx>0) see(-cx,cy); }
    const muz=[]; colMin.forEach((my,fx)=>{ const l=colMin.get(fx-1),rr=colMin.get(fx+1); if((l===undefined||my<=l)&&(rr===undefined||my<=rr)) muz.push({x:fx*cp,y:(my-(EDROWS-1)/2)*cp-cp*0.6}); });
    muz.sort((a,b)=>a.x-b.x);
    return {cv,ox,oy,cp,acc,flameX,tailY,muz,bw,bh}; }
  function buildShipSprite(r,up,nCan){
    if(meta.skin==='custom' && hasCustomShip()) return buildCustomSprite(r);
    const R=makeRng(shipSeed||1);
    const cp=Math.max(2,Math.round(r*0.31));                 // Pixel-Zellgröße (an Hitbox gekoppelt)
    const gh=8+Math.min(2,(up*0.14)|0);                      // Größe wächst nur noch LEICHT mit Ausrüstung (vorher bis +6 → Schiff wurde riesig)
    const gw=2+Math.min(1,(up*0.12)|0);                      // schmaler Rumpf, kaum Wachstum
    const wingLen=3+Math.min(2,(up*0.2)|0);
    const wingPairs=R()<0.55?2:1;                            // 2 = X-Wing-Silhouette, 1 = schlanker Interceptor
    const sweep=0.55+R()*0.45;                               // Flügel-Pfeilung nach hinten
    const sk=curSkin(), hull=sk.hull, edge=sk.edge, acc=sk.rnd?SHIP_ACC[(R()*SHIP_ACC.length)|0]:sk.acc;
    const pad=(wingLen+4)*cp, cw=(gw*2+1)*cp+pad*2, ch=(gh*2+1)*cp+pad*2, ox=pad+gw*cp, oy=pad+gh*cp;
    const grid=new Map(), setc=(x,y,c)=>{ grid.set(x+','+y,c); grid.set((-x)+','+y,c); };
    // --- Schlanker Rumpf mit langer, spitzer Nase ---
    for(let y=-gh;y<=gh;y++){ const ny=(y+gh)/(2*gh); let hw;
      if(ny<0.34) hw=gw*(ny/0.34);                           // lange spitze Nase
      else if(ny<0.82) hw=gw*(0.45+0.55*((ny-0.34)/0.48));   // Rumpf, sanft breiter
      else hw=gw*(1-0.55*((ny-0.82)/0.18));                  // Heck leicht verjüngt
      hw=Math.max(0,Math.round(hw));
      for(let x=0;x<=hw;x++) setc(x,y,hull);
      setc(hw,y,edge);                                       // Neon-Kante
    }
    // --- Cockpit (hell, vorne) ---
    const cy0=-((gh*0.32)|0); for(let y=cy0;y<=cy0+2;y++) setc(0,y,'#caffff'); setc(0,cy0+1,'#fff');
    // --- mittige Akzent-Linie ---
    for(let y=-((gh*0.06)|0);y<=((gh*0.6)|0);y++) if(grid.has('0,'+y)) setc(0,y,acc);
    // --- Gepfeilte Flügel (X-Wing-Silhouette), je Strebe mit Spitzen-Kanone ---
    const wys = wingPairs===2 ? [((gh*0.06)|0),((gh*0.62)|0)] : [((gh*0.38)|0)];
    for(const wy of wys){
      for(let k=1;k<=wingLen;k++){ const yy=Math.min(gh, wy+Math.round(k*sweep)), xx=gw+k;
        setc(xx,yy,acc); setc(xx,yy-1,edge); }              // Strebe (2px) + Neon-Kante
      const tx=gw+wingLen, ty=Math.min(gh, wy+Math.round(wingLen*sweep));
      setc(tx,ty,'#fff');                                   // Flügelspitze
    }
    // --- Waffen an markanten Hardpoints: Hauptgeschütz an der Nase + symmetrische Flügel-/Rumpf-Paare, die aus der Schiffskontur nach VORNE wachsen (statt Striche vorn draufzukleben) ---
    const lead=col=>{ for(let yy=-gh-2;yy<=gh+1;yy++) if(grid.has(col+','+yy)) return yy; return -gh; };
    const mountGun=(col,len)=>{ const ty=lead(col); for(let k=1;k<=len;k++) setc(col,ty-k,(k===len?acc:'#fff')); };   // kurzer Lauf, der aus der Schiffskante nach vorne ragt + Akzent-Mündung
    const hpCols=[gw+wingLen, gw, gw+Math.round(wingLen/2), Math.max(1,(gw/2)|0)];   // Paar-Hardpoints (Spalte spiegelt → 2 Kanonen): Flügelspitze, Rumpfschulter, Flügelmitte, innen
    let guns=0; if(nCan>=1){ mountGun(0,1); guns=1; }         // Hauptgeschütz an der Nase – nur kurze Mündung (Nase ist schon spitz, kein langer Spieß)
    for(const c of hpCols){ if(guns>=nCan) break; mountGun(c,2); guns+=2; }
    // --- Greebles (prozedurale Detailpixel je Run) ---
    const keys=[...grid.keys()]; for(let i=0;i<2+((R()*4)|0);i++){ const p=keys[(R()*keys.length)|0].split(','); setc((+p[0]),(+p[1]), R()<0.5?'#fff':acc); }
    // backen
    const cv=document.createElement('canvas'); cv.width=cw; cv.height=ch; const x=cv.getContext('2d');
    grid.forEach((c,k)=>{ const p=k.split(','), px=ox+(+p[0])*cp, py=oy+(+p[1])*cp; x.fillStyle=c; x.fillRect(px-cp/2,py-cp/2,cp,cp); });
    const nEng=Math.max(1,Math.min(4,1+((up/3)|0))), flameX=[];
    for(let i=0;i<nEng;i++) flameX.push((i-(nEng-1)/2)*Math.max(cp*1.2,(gw*cp)/Math.max(1,nEng)));
    // Mündungen = vorderste vorstehende Pixel je Spalte (Nase, Flügel-/Kanonenspitzen)
    const colMin=new Map(); let mAbsX=0,mAbsY=0; grid.forEach((c,k)=>{ const p=k.split(','),gx=+p[0],gy=+p[1]; const v=colMin.get(gx); if(v===undefined||gy<v) colMin.set(gx,gy);
      if(Math.abs(gx)>mAbsX) mAbsX=Math.abs(gx); if(Math.abs(gy)>mAbsY) mAbsY=Math.abs(gy); });
    const muz=[]; colMin.forEach((my,gx)=>{ const l=colMin.get(gx-1),rr=colMin.get(gx+1); if((l===undefined||my<=l)&&(rr===undefined||my<=rr)) muz.push({x:gx*cp,y:my*cp-cp*0.6}); });
    muz.sort((a,b)=>a.x-b.x);
    return {cv,ox,oy,cp,acc,flameX,tailY:gh*cp+cp*0.5,muz,bw:(mAbsX+0.6)*cp,bh:(mAbsY+0.6)*cp};
  }
  function drawShip(){ const r=player.r;
    let up=0; for(const k in upgradeCounts) up+=upgradeCounts[k]; up+=ownedCount();   // Waffen zählen einfach (vorher ×2 → Schiff wuchs mit jeder Waffe stark)
    const nCan=Math.min(8, ownedCount() + (wpn.blaster?Math.max(0,wpn.blaster.bolts-1):0));
    const sig=shipSeed+'|'+up+'|'+nCan+'|'+Math.round(r)+'|'+(meta.skin||'std');
    if(!shipSprite||shipSig!==sig){ shipSprite=buildShipSprite(r,up,nCan); shipSig=sig; }
    const S=shipSprite;
    const jd=mods.jumpDur||0.55, jp=jumping>0?Math.sin((1-jumping/jd)*Math.PI):0;   // Hüpf-Höhe 0→1→0
    // Bodenschatten + expandierender Schockwellenring beim Sprung
    if(jp>0){ ctx.save();
      ctx.globalAlpha=0.3*(1-jp*0.7); ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(player.x,player.y+r*1.1,r*(1-jp*0.45),r*0.42*(1-jp*0.45),0,0,6.28); ctx.fill();
      const rr=r+(1-jumping/jd)*JUMP_R; ctx.globalAlpha=Math.max(0,0.55*(jumping/jd)); ctx.strokeStyle='#19f0ff'; ctx.lineWidth=3; ctx.shadowBlur=12; ctx.shadowColor='#19f0ff'; ctx.beginPath(); ctx.arc(player.x,player.y,rr,0,6.28); ctx.stroke();
      ctx.restore(); }
    ctx.save(); ctx.translate(player.x,player.y-jp*r*1.3); if(jp>0){ const js=1+0.5*jp; ctx.scale(js,js); }
    // Live-Triebwerksflammen am Heck
    ctx.shadowBlur=12; ctx.shadowColor='#ff9a2e';
    for(const fx of S.flameX){ const fl=S.cp*(1.6+2.2*Math.abs(Math.sin((elapsed||0)*28+fx))); ctx.fillStyle='#ffd000';
      ctx.beginPath(); ctx.moveTo(fx-S.cp*0.9,S.tailY); ctx.lineTo(fx+S.cp*0.9,S.tailY); ctx.lineTo(fx,S.tailY+fl); ctx.closePath(); ctx.fill(); }
    // Pixel-Sprite – der Spieler ist der Fokus, glüht am hellsten und pulsiert mit dem Beat
    ctx.shadowBlur=16+(beatPulse||0)*8+(overdrive?6:0); ctx.shadowColor=S.acc; ctx.drawImage(S.cv,-S.ox,-S.oy); ctx.shadowBlur=0;
    if(shields>0) drawShipShield(S);   // Energie-Schild um die Schiffsform
    ctx.restore();
    drawJumpRing(); drawJumpReticle(); }
  // Landungs-Visier: während des Sprungs ein Zielmarker am Landepunkt (=tgt) → gezieltes Stompen
  function drawJumpReticle(){ if(mode==='zen'||jumping<=0) return; const x=tgt.x,y=tgt.y, jd=mods.jumpDur||0.55, p=1-jumping/jd;
    const rr=18+player.r, pu=0.6+0.4*Math.sin((elapsed||0)*22); ctx.save(); ctx.globalAlpha=0.55+0.35*p; ctx.strokeStyle='#19f0ff'; ctx.lineWidth=2.4;
    if(fxQ>0.7){ ctx.shadowBlur=12; ctx.shadowColor='#19f0ff'; }
    ctx.beginPath(); ctx.arc(x,y,rr*(0.7+0.3*pu),0,6.28); ctx.stroke();
    for(let i=0;i<4;i++){ const a=i*Math.PI/2+p*1.2, c=Math.cos(a),s=Math.sin(a); ctx.beginPath(); ctx.moveTo(x+c*rr*0.5,y+s*rr*0.5); ctx.lineTo(x+c*rr*1.15,y+s*rr*1.15); ctx.stroke(); }
    ctx.restore(); }
  // Kleine Top-Meldung „Sprung bereit", sobald eine Ladung wieder verfügbar ist (ein-/ausblendend)
  function drawJumpReady(){ if(jumpReadyT<=0||mode==='zen') return; if(banner && banner.t>0.05) return;   // niemals über einer aktiven Banner-Meldung
    const al=Math.max(0,Math.min(1,(1.7-jumpReadyT)/0.18, jumpReadyT/0.4)), txt='▲ '+t('jumpHint');
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='800 15px Orbitron, sans-serif';
    const w=ctx.measureText(txt).width+34, h=30, x=W/2, y=Math.max(112,H*0.16);   // klar unter der HYPE-Leiste (y≈70)
    ctx.globalAlpha=al*0.9; ctx.fillStyle='rgba(8,1,15,0.82)'; ctx.strokeStyle='#19f0ff'; ctx.lineWidth=1.6; if(fxQ>0.7){ ctx.shadowBlur=14; ctx.shadowColor='#19f0ff'; }
    ctx.beginPath(); rr(x-w/2,y-h/2,w,h,10); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
    ctx.globalAlpha=al; ctx.fillStyle='#19f0ff'; ctx.fillText(txt,x,y+1); ctx.restore(); }
  // Aufladering des Sprung-Dash um das Schiff (füllt sich in JUMP_CD; bei „voll" sanft pulsierend)
  function drawJumpRing(){ if(mode==='zen'||jumping>0) return; const x=player.x,y=player.y,rng=player.r+9, ready=jumpStock>=1, max=mods.jumpMax||1, pu=0.5+0.5*Math.sin((elapsed||0)*6);
    ctx.save(); ctx.lineWidth=2.6;
    // Aufladering ums Schiff: ist mind. eine Ladung bereit, pulsiert der volle Ring; sonst füllt sich der Bogen in jumpCd
    if(ready){ ctx.globalAlpha=0.4+0.4*pu; ctx.strokeStyle='#19f0ff'; if(fxQ>0.7){ ctx.shadowBlur=10; ctx.shadowColor='#19f0ff'; } ctx.beginPath(); ctx.arc(x,y,rng,0,6.28); ctx.stroke(); ctx.shadowBlur=0; }
    if(jumpStock<max){ ctx.globalAlpha=0.18; ctx.strokeStyle='#fff'; ctx.beginPath(); ctx.arc(x,y,rng,0,6.28); ctx.stroke();
      ctx.globalAlpha=0.9; ctx.strokeStyle='#19f0ff'; ctx.beginPath(); ctx.arc(x,y,rng,-Math.PI/2,-Math.PI/2+6.28*jumpCharge); ctx.stroke(); }
    // Klare Sprung-Ladungs-Anzeige als Chevrons ÜBER dem Schiff – immer sichtbar, fern von HYPE-Leiste & Bannern.
    // Gefüllt + pulsierend = bereit · der ladende Chevron füllt sich von unten · Umriss = leere Ladung.
    const cw=14, gap=5, total=max*cw+(max-1)*gap, bx=x-total/2, by=y-player.r-22;
    const chev=cxv=>{ ctx.beginPath(); ctx.moveTo(cxv,by-7); ctx.lineTo(cxv+cw/2,by+5); ctx.lineTo(cxv-cw/2,by+5); ctx.closePath(); };
    for(let i=0;i<max;i++){ const cxv=bx+i*(cw+gap)+cw/2, rdy=i<jumpStock, fill=rdy?1:(i===jumpStock?jumpCharge:0);
      ctx.globalAlpha=0.9; ctx.lineWidth=1.6; ctx.strokeStyle=rdy?'#19f0ff':'rgba(255,255,255,0.4)'; chev(cxv); ctx.stroke();
      if(fill>0){ ctx.save(); ctx.beginPath(); ctx.rect(cxv-cw,by+5-12*fill,cw*2,12*fill); ctx.clip();
        ctx.globalAlpha=rdy?0.8+0.2*pu:0.55; ctx.fillStyle='#19f0ff'; if(fxQ>0.7&&rdy){ ctx.shadowBlur=9; ctx.shadowColor='#19f0ff'; }
        chev(cxv); ctx.fill(); ctx.shadowBlur=0; ctx.restore(); } }
    ctx.restore(); }
  // Menü-Schaufenster: das aktuelle Schiff (Skin + Loadout-Detail) zentral vor der Sonne, sanft schwebend
  let menuShip=null, menuShipSig='';
  function drawMenuShip(){
    const wl=(meta.loadout&&meta.loadout.w)?Object.keys(meta.loadout.w).length:1;   // mehr Waffen → detaillierteres Schiff (ohne Run-State)
    const up=Math.min(16,2+wl*3), nCan=Math.min(8,wl+1);
    const sig=(meta.skin||'std')+'|'+(shipSeed||0)+'|'+wl;
    if(!menuShip||menuShipSig!==sig){ try{ menuShip=buildShipSprite(30,up,nCan); }catch(e){ menuShip=null; } menuShipSig=sig; }
    const S=menuShip; if(!S||!S.cv||!S.cv.height) return;
    const e=elapsed||0, hz=H*0.42, bob=Math.sin(e*1.05)*7, tilt=Math.sin(e*0.7)*0.04;
    const sc=Math.min(170,H*0.22)/S.cv.height;
    ctx.save(); ctx.translate(W/2,hz+bob); ctx.rotate(tilt); ctx.scale(sc,sc); ctx.imageSmoothingEnabled=false;
    ctx.shadowBlur=12; ctx.shadowColor='#ff9a2e';
    for(const fx of S.flameX){ const fl=S.cp*(1.5+2.0*Math.abs(Math.sin(e*16+fx))); ctx.fillStyle='#ffd000';
      ctx.beginPath(); ctx.moveTo(fx-S.cp*0.9,S.tailY); ctx.lineTo(fx+S.cp*0.9,S.tailY); ctx.lineTo(fx,S.tailY+fl); ctx.closePath(); ctx.fill(); }
    ctx.shadowBlur=18+Math.sin(e*2)*5; ctx.shadowColor=S.acc; ctx.drawImage(S.cv,-S.ox,-S.oy); ctx.shadowBlur=0;
    ctx.restore(); }
  function shieldSil(S){ if(S.sil!==undefined) return S.sil; let o=null;   // schiff-förmige Silhouette in Schildfarbe (Kontur-Aura)
    try{ o=document.createElement('canvas'); o.width=S.cv.width; o.height=S.cv.height; const c=o.getContext('2d');
      c.drawImage(S.cv,0,0); c.globalCompositeOperation='source-in'; c.fillStyle='#2effc0'; c.fillRect(0,0,o.width,o.height); }catch(e){ o=null; } S.sil=o; return o; }
  // Cooles Energie-Schild: Kontur-Aura (hugs Pixelform) + wellige rotierende Ringe + schimmernde Knoten (Annahme: Kontext bereits auf player zentriert)
  function drawShipShield(S){ const t=elapsed||0, col='#2effc0', R0=Math.max(S.bw||player.r,S.bh||player.r)+8;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    // Kontur-Aura: hugs Pixelform (pulsierend)
    const sil=shieldSil(S); if(sil){ const p=0.5+0.5*Math.sin(t*4.2), sc=1.10+0.05*p; ctx.globalAlpha=0.16+0.16*p;
      ctx.drawImage(sil,-S.ox*sc,-S.oy*sc,S.cv.width*sc,S.cv.height*sc); ctx.globalAlpha=1; }
    // konzentrische Schild-Kreise (1 pro Schild) – wie früher, an Schiffsgröße angepasst + Glow + schimmernder Knoten
    for(let s=0;s<shields;s++){ const rad=R0+s*7, rot=t*(0.6+s*0.2)*(s%2?-1:1);
      ctx.shadowBlur=10; ctx.shadowColor=col; ctx.strokeStyle=hexA(col,0.6-s*0.06); ctx.lineWidth=2.2; ctx.beginPath(); ctx.arc(0,0,rad,0,6.28); ctx.stroke();
      ctx.shadowBlur=0; ctx.strokeStyle=hexA('#dffffb',0.3-s*0.03); ctx.lineWidth=1; ctx.beginPath(); ctx.arc(0,0,rad,0,6.28); ctx.stroke();
      const nx=Math.cos(rot)*rad, ny=Math.sin(rot)*rad; ctx.fillStyle=hexA('#dffffb',0.9); ctx.beginPath(); ctx.arc(nx,ny,2.6,0,6.28); ctx.fill(); }
    ctx.shadowBlur=0; ctx.restore(); }
  function drawMouth(m,t){ const y=m.oy, w=m.w, h=w*0.4; ctx.save(); ctx.translate(0,y); ctx.fillStyle='#08010f';
    if(m.type==='grin'){ ctx.strokeStyle='#08010f'; ctx.lineWidth=Math.max(3,h*0.22); ctx.beginPath(); ctx.arc(0,-h*0.2,w*0.5,0.15*Math.PI,0.85*Math.PI); ctx.stroke(); }
    else if(m.type==='o'){ const r=w*0.26*(1+0.2*Math.sin(t*8)); ctx.beginPath(); ctx.arc(0,0,r,0,6.28); ctx.fill(); }
    else if(m.type==='fangs'){ ctx.beginPath(); ctx.ellipse(0,0,w*0.42,h*0.5,0,0,6.28); ctx.fill(); ctx.fillStyle='#fff';
      ctx.beginPath(); ctx.moveTo(-w*0.28,-h*0.4); ctx.lineTo(-w*0.16,h*0.55); ctx.lineTo(-w*0.04,-h*0.4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w*0.28,-h*0.4); ctx.lineTo(w*0.16,h*0.55); ctx.lineTo(w*0.04,-h*0.4); ctx.fill(); }
    else { ctx.fillRect(-w*0.45,-h*0.4,w*0.9,h*0.8); ctx.fillStyle='#fff'; for(let i=0;i<5;i++) ctx.fillRect(-w*0.45+i*w*0.18+2,-h*0.4,w*0.06,h*0.8); }
    ctx.restore(); }
  // Cineastischer Boss-Auftritt: dunkles Band, einschlagender Meme-Name, Signatur-Mega-Attacke
  function drawBossIntro(){ const B=boss; if(!B) return; const D=1.8, T=Math.max(0,bossIntroT), p=1-T/D;   // p: 0→1
    const fin=B.final, accent=fin?'#ff2e6e':'#ffe600';
    const aIn=Math.min(1,(D-T)/0.22), aOut=p>0.82?(1-(p-0.82)/0.18):1, a=Math.max(0,Math.min(1,aIn*aOut));
    ctx.save(); ctx.textAlign='center';
    // dunkles Band quer über die Mitte
    const bandH=170, by=H*0.40; ctx.globalAlpha=a*0.7; ctx.fillStyle='rgba(8,1,15,0.9)'; ctx.fillRect(0,by-bandH/2,W,bandH);
    ctx.globalAlpha=a; ctx.strokeStyle=accent; ctx.shadowBlur=14; ctx.shadowColor=accent; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(0,by-bandH/2); ctx.lineTo(W,by-bandH/2); ctx.moveTo(0,by+bandH/2); ctx.lineTo(W,by+bandH/2); ctx.stroke(); ctx.shadowBlur=0;
    // Label
    ctx.globalAlpha=a; ctx.fillStyle=accent; ctx.font='800 clamp(13px,3.4vw,18px) Orbitron, sans-serif'; ctx.fillText(fin?t('endgegner'):'⚡ BOSS ⚡',W/2,by-44);
    // Name (slammt rein: groß → 1, leicht zittern beim Aufprall)
    const slam=p<0.28?1+(1-p/0.28)*1.4:1, jit=p<0.34?(0.34-p)*30:0;
    ctx.save(); ctx.translate(W/2+(Math.random()*2-1)*jit, by+6+(Math.random()*2-1)*jit*0.5); ctx.scale(slam,slam);
    ctx.fillStyle='#fff'; ctx.shadowBlur=26; ctx.shadowColor=accent; ctx.font='900 clamp(26px,7.6vw,52px) Orbitron, sans-serif'; ctx.fillText(B.name||'BOSS',0,0); ctx.restore();
    // Signatur-Mega-Attacke (gleitet von unten rein)
    const sy=by+58+(1-Math.min(1,(D-T)/0.5))*26; ctx.globalAlpha=a*Math.min(1,(D-T)/0.4);
    ctx.fillStyle='#9be7ff'; ctx.shadowBlur=8; ctx.shadowColor='#19f0ff'; ctx.font='700 clamp(13px,3.4vw,18px) Orbitron, sans-serif';
    ctx.fillText('☄ '+t('signature')+': '+(B.megaName||'?'),W/2,sy); ctx.restore(); }
  function drawBoss(){ const B=boss, S=B&&B.sp; if(!B||!S) return;
    if(B.megaPhase==='tele'){ const p=1-(B.megaWarn/1.15); ctx.save(); ctx.globalAlpha=0.5+0.4*Math.abs(Math.sin(B.megaWarn*20)); ctx.strokeStyle='#ff2e6e'; ctx.lineWidth=3.5; ctx.shadowBlur=16; ctx.shadowColor='#ff2e6e'; ctx.beginPath(); ctx.arc(B.x,B.y,B.r*(1.2+p*0.85),0,6.28); ctx.stroke(); ctx.restore(); }   // Mega-Telegraph: pulsierender roter Ring
    if(B.stun>0){ ctx.save(); const pu=0.5+0.5*Math.sin((elapsed||0)*16); ctx.globalAlpha=0.55+0.35*pu; ctx.strokeStyle='#ffe600'; ctx.lineWidth=3; if(fxQ>0.7){ ctx.shadowBlur=14; ctx.shadowColor='#ffe600'; } ctx.beginPath(); ctx.arc(B.x,B.y,B.r*1.25,0,6.28); ctx.stroke();
      ctx.shadowBlur=0; ctx.fillStyle='#ffe600'; for(let i=0;i<5;i++){ const a=(elapsed||0)*4+i*1.256, sx=B.x+Math.cos(a)*B.r*1.45, sy=B.y-B.r*1.1+Math.sin(a*1.7)*6; ctx.beginPath(); ctx.arc(sx,sy,3,0,6.28); ctx.fill(); } ctx.restore(); }   // Stun-Telegraph: gelber Ring + umkreisende Funken
    const tg=B.telegraph?(0.4+0.5*Math.abs(Math.sin(B.warn*22))):0;
    ctx.save(); ctx.translate(B.x,B.y);
    const bz=B.fleeing?0.17:0.07, sc=B.scale||1;   // beim Fliehen: dickes Lach-Wackeln + Wachstum
    const wjx=1+bz*Math.sin(B.t*5), wjy=1+bz*Math.sin(B.t*5+1.6); ctx.scale(wjx*sc,wjy*sc);
    // Tentakel (hinter dem Körper, wedeln)
    for(const t of S.tents){ ctx.strokeStyle=t.col; ctx.lineWidth=S.cp; ctx.lineCap='round'; ctx.shadowBlur=10; ctx.shadowColor=t.col; ctx.beginPath(); ctx.moveTo(t.ox,B.r*0.45);
      for(let s=1;s<=t.len;s++) ctx.lineTo(t.ox+Math.sin(B.t*5+s*0.7+t.ph)*S.cp*1.4,B.r*0.45+s*S.cp*1.3); ctx.stroke(); }
    // Fühler (oben, wippen)
    for(const a of S.ants){ ctx.strokeStyle=a.col; ctx.lineWidth=Math.max(2,S.cp*0.4); ctx.shadowBlur=8; ctx.shadowColor=a.col;
      const tx=a.ox+Math.sin(B.t*4+a.ph)*S.cp*1.6, ty=-B.r*0.55-S.cp*2.6; ctx.beginPath(); ctx.moveTo(a.ox,-B.r*0.42); ctx.lineTo(tx,ty); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(tx,ty,S.cp*0.6,0,6.28); ctx.fill(); }
    // Körper-Sprite (gebacken) mit Neon-Glühen
    if(B.dead && B.style==='meltdown' && B.flick){ ctx.drawImage(S.white,-S.ox,-S.oy); }   // elektrisches Strobe-Flackern
    else { ctx.shadowBlur=22+tg*22; ctx.shadowColor=tg>0?'#ff2e88':S.pal[0]; ctx.drawImage(S.cv,-S.ox,-S.oy); ctx.shadowBlur=0; }
    if(B.hitFlash>0){ ctx.globalAlpha=Math.min(1,B.hitFlash*9); ctx.drawImage(S.white,-S.ox,-S.oy); ctx.globalAlpha=1; }
    // Augen (verfolgen Spieler + blinzeln) & Augenbrauen
    const pa=Math.atan2(player.y-B.y,player.x-B.x), bk=B.blink>0;
    for(const e of S.eyes){ ctx.save(); ctx.translate(e.ox,e.oy);
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(0,0,e.s,bk?e.s*0.12:e.s,0,0,6.28); ctx.fill();
      if(!bk){ ctx.fillStyle='#08010f'; ctx.beginPath(); ctx.arc(Math.cos(pa)*e.s*0.42,Math.sin(pa)*e.s*0.42,e.s*0.46,0,6.28); ctx.fill(); }
      if(S.brows){ ctx.strokeStyle='#08010f'; ctx.lineWidth=Math.max(2,S.cp*0.5); ctx.beginPath(); ctx.moveTo(-e.s,-e.s*1.05); ctx.lineTo(e.s*0.6,-e.s*0.6); ctx.stroke(); }
      ctx.restore(); }
    drawMouth(S.mouth,B.t);
    // Blink-Lichter auf dem Körper
    for(const l of S.lights){ if(Math.floor(B.t*5+l.ph)%2){ ctx.fillStyle='#fff'; ctx.fillRect(l.ox-S.cp*0.4,l.oy-S.cp*0.4,S.cp*0.8,S.cp*0.8); } }
    ctx.restore();
    if(B.fleeing){ ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';   // höhnisches Lach-Emote über dem Boss
      ctx.font='800 24px Orbitron, sans-serif'; ctx.fillStyle='#ffe600'; ctx.shadowBlur=16; ctx.shadowColor='#ff2e88';
      const wob=Math.sin(B.t*1.6)*7;
      ctx.fillText('😂 HA HA HA!', B.x+wob, B.y-B.r*(B.scale||1)*1.25-14); ctx.restore(); }
    // HP-Leiste oben
    if(!B.dead && !B.fleeing){ const bw=Math.min(W*0.66,380), bx=W/2-bw/2, by=(mode!=='zen'?48:30), col=S.pal[0];
      ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font='700 12px Orbitron, sans-serif'; ctx.fillStyle=col; ctx.shadowBlur=8; ctx.shadowColor=col;
      ctx.fillText('🛸 '+B.name,W/2,by-10);
      ctx.shadowBlur=0; ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(bx-2,by-2,bw+4,10);
      ctx.fillStyle=col; ctx.fillRect(bx,by,bw*Math.max(0,B.hp/B.maxHp),6);
      if((B.stagger||0)>0 && !(B.stun>0)){ ctx.fillStyle='rgba(255,230,0,.22)'; ctx.fillRect(bx,by+7,bw,3); ctx.fillStyle='#ffe600'; ctx.fillRect(bx,by+7,bw*Math.min(1,B.stagger),3); }   // Stagger-Leiste: füllt sich mit Boss-Stomps → voll = Stun
      ctx.restore(); }
  }
  function drawHearts(){
    const n=lives; if(!n||n<=0) return;
    const gap=30, y=26; let x=W/2-(n-1)*gap/2;
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font='22px Space Mono, monospace';
    ctx.shadowBlur=14; ctx.shadowColor='#ff2e88'; ctx.fillStyle='#ff3b6b';
    for(let i=0;i<n;i++){ ctx.fillText('♥',x,y); x+=gap; }
    ctx.restore();
  }
  function drawShields(){ const n=shields; if(!n) return;          // Schild-Anzeige im HUD (gezeichnete Form statt Emoji → überall sichtbar)
    const gap=24, y=(lives>0&&mode!=='zen')?54:28; let x=W/2-(n-1)*gap/2;
    ctx.save(); ctx.shadowBlur=10; ctx.shadowColor='#2effc0'; ctx.fillStyle='#2effc0'; ctx.strokeStyle='rgba(8,1,15,.7)'; ctx.lineWidth=1.5;
    for(let i=0;i<n;i++){ const s=8;
      ctx.beginPath(); ctx.moveTo(x,y-s); ctx.lineTo(x+s,y-s*0.5); ctx.lineTo(x+s,y+s*0.25);
      ctx.quadraticCurveTo(x+s,y+s,x,y+s*1.3); ctx.quadraticCurveTo(x-s,y+s,x-s,y+s*0.25); ctx.lineTo(x-s,y-s*0.5); ctx.closePath();
      ctx.fill(); ctx.stroke(); x+=gap; }
    ctx.restore();
  }

  // ---------- Effekt-Timer-HUD (DOM, oben): aktive Effekte mit Countdown ----------
  // [key, icon, rest, max, farbe, label]
  function buildFxItems(){ const a=[]; if(!effects) return a;
    if(effects.slowmo>0) a.push(['slowmo','⏱',effects.slowmo,Math.min(8,4*(mods.slowmoMult||1)),'#5b9bff',t('fxSlow')]);
    if(effects.magnet>0) a.push(['magnet','🧲',effects.magnet,30,'#c45bff',t('fxMagnet')]);
    if(effects.double>0) a.push(['double','✕2',effects.double,30,'#ffe600',t('fxDouble')]);
    for(const c of activeCurses){ const u=UPGRADES.find(x=>x.id===c.id); a.push(['cz_'+c.id,(u?u.ico:'🎲'),c.t,c.max,CURSE_COL[c.id]||'#ff3b6b',uName(c.id)+(c.stacks>1?(' ×'+c.stacks):'')]); }
    return a; }
  let fxSig='';
  function renderFxbar(){ const bar=document.getElementById('fxbar'); if(!bar) return;
    const on=(state===S.PLAY||state===S.PAUSE||state===S.UPGRADE), items=on?buildFxItems():[];
    const sig=items.map(i=>i[0]+(i[0]==='mirror'?(mirrorOn?'1':'0'):'')).join(',');
    if(sig!==fxSig){ fxSig=sig; bar.classList.toggle('hidden',!items.length); bar.innerHTML='';
      for(const it of items){ const chip=document.createElement('div'); chip.className='fxchip'; chip.dataset.k=it[0]; chip.style.setProperty('--fc',it[4]);
        chip.setAttribute('aria-label',it[5]);
        chip.innerHTML='<span class="fxico">'+it[1]+'</span><span class="fxmid"><span class="fxlbl">'+it[5]+'</span><span class="fxtrk"><i></i></span></span><span class="fxsec"></span>';
        bar.appendChild(chip); } }
    for(const it of items){ const chip=bar.querySelector('.fxchip[data-k="'+it[0]+'"]'); if(!chip) continue;
      const frac=Math.max(0,Math.min(1,it[2]/it[3])); const fill=chip.querySelector('.fxtrk i'); if(fill) fill.style.transform='scaleX('+frac+')';   // transform statt width → kein Reflow/Frame
      const sec=chip.querySelector('.fxsec'); if(sec) sec.textContent=Math.max(0,Math.ceil(it[2]))+'s'; } }

  let sunOff=null, sunOffCtx=null, waveOff=null, waveOffCtx=null, sunLo=null, sunLoCtx=null, sunPulse=0;   // Sonne (scharf) + Wellen-Ebene; sunPulse = geglättete Musik-Energie
  // ---------- Horizont-Szene: Nebel, Bergkette, Skyline, Sonnen-Reflexion (alle theme-farbig) ----------
  let sceneCity=[], sceneMtn=[], sceneRobot=null, sceneW=0, sceneKey='';
  const ri=(a,b)=>(a+Math.random()*(b-a+1))|0;
  // Pro Level eine eigene Skyline-DNA → komplett andere Vibes. 'block' = überall der Füll-Wolkenkratzer.
  const SKYSETS=[
    ['pyramid','tower','step','block','block'],     // 0 Synthwave – Tokyo-3 / NERV
    ['palm','palm','dome','block','block'],         // 1 Sonnenuntergang – Strand / Resort
    ['spire','spire','tower','block','block'],      // 2 Aurora – Eis / Kristall
    ['dome','arch','dome','block','block'],         // 3 Tiefsee – versunkene Kuppeln
    ['temple','statue','step','block','block'],     // 4 Vaporwave – Antike
    ['stack','stack','tower','block','block']       // 5 Inferno – Industrie / Raffinerie
  ];
  function genScene(key){ sceneW=W; sceneKey=key;
    sceneMtn=[]; let mx=-60; while(mx<W+60){ const w=ri(150,300), h=ri(26,86); sceneMtn.push([mx+w/2,w,h]); mx+=Math.round(w*0.5); }
    const set=SKYSETS[(+key||0)%SKYSETS.length];
    sceneCity=[]; let xx=-30; while(xx<W+30){ let type=set[ri(0,set.length-1)], w,h,win=[],beac=-1;
      switch(type){
        case 'pyramid': w=ri(34,60); h=ri(44,80); break;
        case 'tower':   w=ri(10,18); h=ri(58,104); break;
        case 'step':    w=ri(22,42); h=ri(28,62); break;
        case 'palm':    w=ri(18,32); h=ri(40,78); break;
        case 'dome':    w=ri(28,52); h=ri(26,46); break;
        case 'spire':   w=ri(12,24); h=ri(54,110); break;
        case 'arch':    w=ri(30,52); h=ri(30,52); break;
        case 'temple':  w=ri(42,72); h=ri(30,52); break;
        case 'statue':  w=ri(16,26); h=ri(40,68); break;
        case 'stack':   w=ri(12,22); h=ri(50,96); break;
        default: type='block'; w=ri(9,30); h=ri(12,64);   // Standard-Wolkenkratzer mit Fensterlichtern
          if(h>14){ for(let wy=6;wy<h-3;wy+=6){ for(let wxp=3;wxp<w-2;wxp+=5){ if(Math.random()<0.20) win.push([wxp,wy,Math.random()<0.34?(1+Math.random()*5):0]); } } }
          beac=(h>30)?Math.random()*6.28:-1;
      }
      sceneCity.push([xx,w,h,win,type,beac]); xx+=w+ri(4,18); } }
  // Skyline pro Level neu würfeln (anderes Set) + bei Resize. bossActive nutzt weiter das Level-Set (nur Farben kippen).
  function ensureScene(){ const key=String((Math.max(1,level||1)-1)%SKYSETS.length); if(sceneW!==W||sceneKey!==key) genScene(key); }
  const rgA=(c,a)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
  function drawNebula(hz){ if(fxQ<0.6) return; ctx.save(); ctx.globalCompositeOperation='lighter'; const sc=curBg.sun, gc=curBg.grid, e=elapsed||0;
    const blobs=[[W*0.26+Math.sin(e*0.05)*22,hz*0.42,gc,0.05],[W*0.76+Math.cos(e*0.045)*22,hz*0.55,sc,0.045]];
    for(const bl of blobs){ const r=W*0.52, g=ctx.createRadialGradient(bl[0],bl[1],6,bl[0],bl[1],r); g.addColorStop(0,rgA(bl[2],bl[3])); g.addColorStop(1,rgA(bl[2],0)); ctx.fillStyle=g; ctx.fillRect(bl[0]-r,bl[1]-r,r*2,r*2); }
    ctx.restore(); }
  function drawMountains(hz){ ensureScene();
    for(const m of sceneMtn){ const cx=m[0],w=m[1],h=m[2];
      ctx.fillStyle='rgba(9,2,20,0.78)'; ctx.beginPath(); ctx.moveTo(cx-w/2,hz+1); ctx.lineTo(cx,hz-h); ctx.lineTo(cx+w/2,hz+1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=rgA(curBg.grid,0.18); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(cx-w/2,hz+1); ctx.lineTo(cx,hz-h); ctx.lineTo(cx+w/2,hz+1); ctx.stroke(); } }
  // EVA-Mecha: dunkle Silhouette mit Neon-Outline + glühendem Visor & Brust-Kern (steht hinter der Skyline)
  function drawRobot(hz){ const r=sceneRobot; if(!r) return; const bx=r.x, Hr=r.h, Wm=Hr*0.34, e=elapsed||0;
    ctx.save(); ctx.translate(bx,hz); ctx.lineJoin='round'; ctx.lineWidth=1.3;
    const fill='rgba(7,1,16,0.95)', edge=rgA(curBg.grid,0.5);
    const poly=p=>{ ctx.beginPath(); ctx.moveTo(p[0],p[1]); for(let i=2;i<p.length;i+=2) ctx.lineTo(p[i],p[i+1]); ctx.closePath(); ctx.fillStyle=fill; ctx.fill(); ctx.strokeStyle=edge; ctx.stroke(); };
    poly([-Wm*0.42,0,-Wm*0.27,0,-Wm*0.15,-Hr*0.5,-Wm*0.33,-Hr*0.5]);   // Bein L
    poly([Wm*0.42,0,Wm*0.27,0,Wm*0.15,-Hr*0.5,Wm*0.33,-Hr*0.5]);       // Bein R
    poly([-Wm*0.26,-Hr*0.46,Wm*0.26,-Hr*0.46,Wm*0.26,-Hr*0.64,-Wm*0.26,-Hr*0.64]);   // Hüfte/Torso
    poly([-Wm*0.44,-Hr*0.62,Wm*0.44,-Hr*0.62,Wm*0.5,-Hr*0.74,Wm*0.3,-Hr*0.85,-Wm*0.3,-Hr*0.85,-Wm*0.5,-Hr*0.74]);   // Brust
    poly([-Wm*0.5,-Hr*0.78,-Wm*0.32,-Hr*0.78,-Wm*0.46,-Hr*1.0]);   // Schulter-Pylon L
    poly([Wm*0.5,-Hr*0.78,Wm*0.32,-Hr*0.78,Wm*0.46,-Hr*1.0]);     // Schulter-Pylon R
    poly([-Wm*0.13,-Hr*0.84,Wm*0.13,-Hr*0.84,Wm*0.13,-Hr*0.96,0,-Hr*1.07,-Wm*0.13,-Hr*0.96]);   // Kopf + Horn
    ctx.fillStyle=rgA(curBg.sun,0.85+0.15*Math.sin(e*3)); ctx.fillRect(-Wm*0.09,-Hr*0.92,Wm*0.18,Hr*0.03);   // glühender Visor
    ctx.fillStyle=rgA(curBg.sun,0.5+0.35*Math.sin(e*2+1)); ctx.beginPath(); ctx.arc(0,-Hr*0.71,Wm*0.07,0,6.28); ctx.fill();   // Brust-Kern
    ctx.restore(); }
  function drawSkyline(hz){ ensureScene(); const e=elapsed||0, tw=0.6+0.4*Math.sin(e*3);
    const dark='rgba(4,1,12,0.94)', edge=rgA(curBg.grid,0.55);
    ctx.lineWidth=1;
    for(const b of sceneCity){ const bx=b[0],w=b[1],h=b[2],win=b[3],type=b[4], top=hz-h, cx=bx+w/2;
      ctx.fillStyle=dark; ctx.strokeStyle=edge;
      if(type==='pyramid'){ const tt=w*0.32;   // NERV-Pyramide (Trapez) mit Apex-Licht + Mittelstrebe
        ctx.beginPath(); ctx.moveTo(bx,hz); ctx.lineTo(cx-tt/2,top); ctx.lineTo(cx+tt/2,top); ctx.lineTo(bx+w,hz); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle=rgA(curBg.grid,0.28); ctx.beginPath(); ctx.moveTo(cx,top); ctx.lineTo(cx,hz); ctx.moveTo(bx+w*0.25,hz); ctx.lineTo(cx-tt*0.25,top); ctx.moveTo(bx+w*0.75,hz); ctx.lineTo(cx+tt*0.25,top); ctx.stroke();
        ctx.fillStyle=rgA(curBg.sun,0.6+0.4*Math.sin(e*4+bx)); ctx.fillRect(cx-1.5,top-3,3,3);
      } else if(type==='tower'){ const tw2=Math.min(w,14), lx=cx-tw2/2;   // Sendeturm mit Antenne + rotem Blinklicht
        ctx.fillRect(lx,top,tw2,h); ctx.strokeRect(lx,top,tw2,h);
        ctx.strokeStyle=rgA(curBg.grid,0.28); for(let yy=top+7;yy<hz-3;yy+=8){ ctx.beginPath(); ctx.moveTo(lx,yy); ctx.lineTo(lx+tw2,yy); ctx.stroke(); }
        ctx.strokeStyle=edge; ctx.beginPath(); ctx.moveTo(cx,top); ctx.lineTo(cx,top-h*0.3); ctx.stroke();
        const blink=Math.sin(e*2.2+bx)>0.3; ctx.fillStyle=blink?'#ff3344':'rgba(120,24,32,0.6)'; ctx.fillRect(cx-1.5,top-h*0.3-2,3,3);
      } else if(type==='palm'){ const ty=top+h*0.12;   // Strand-Palme: geschwungener Stamm + Wedel-Krone
        ctx.strokeStyle=edge; ctx.lineWidth=Math.max(2,w*0.1); ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(cx-w*0.06,hz); ctx.quadraticCurveTo(cx+w*0.18,hz-h*0.55,cx,ty); ctx.stroke();   // Stamm
        const fr=h*0.5; for(let k=-3;k<=3;k++){ const a=-1.57+k*0.42; ctx.beginPath(); ctx.moveTo(cx,ty);   // Wedel fächern + droopen
          ctx.quadraticCurveTo(cx+Math.cos(a)*fr*0.55,ty+Math.sin(a)*fr*0.55-fr*0.18, cx+Math.cos(a)*fr,ty+Math.sin(a)*fr*0.7+5); ctx.stroke(); }
        ctx.lineWidth=1; ctx.lineCap='butt'; ctx.fillStyle=rgA(curBg.sun,0.55); ctx.beginPath(); ctx.arc(cx,ty-1,2,0,6.28); ctx.fill();   // Krone
      } else if(type==='dome'){ const bh=h*0.42, my=hz-bh, dr=h*0.66;   // Kuppel/Observatorium mit Spitzenlicht
        ctx.fillRect(bx,my,w,bh); ctx.strokeRect(bx,my,w,bh);
        ctx.fillStyle=dark; ctx.beginPath(); ctx.ellipse(cx,my,w*0.5,dr,0,Math.PI,Math.PI*2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle=rgA(curBg.grid,0.22); ctx.beginPath(); ctx.moveTo(cx,my-dr); ctx.lineTo(cx,my); ctx.moveTo(bx,my); ctx.lineTo(bx+w,my); ctx.stroke();
        ctx.fillStyle=rgA(curBg.sun,0.55+0.45*Math.sin(e*3+bx)); ctx.fillRect(cx-1.5,my-dr-3,3,3);
      } else if(type==='spire'){   // Eis-Kristall: spitze Nadel mit Facetten + glitzernder Spitze
        ctx.beginPath(); ctx.moveTo(bx,hz); ctx.lineTo(cx,top); ctx.lineTo(bx+w,hz); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle=rgA(curBg.grid,0.3); ctx.beginPath(); ctx.moveTo(cx,top); ctx.lineTo(cx,hz); ctx.moveTo(cx,top+h*0.42); ctx.lineTo(bx+w*0.18,hz); ctx.moveTo(cx,top+h*0.42); ctx.lineTo(bx+w*0.82,hz); ctx.stroke();
        ctx.fillStyle=rgA(curBg.sun,0.45+0.55*Math.sin(e*4+bx)); ctx.fillRect(cx-1,top-2,2,5);
      } else if(type==='arch'){ const top2=hz-h, legW=w*0.2, ar=(w-2*legW)/2, sy=hz-h*0.46;   // versunkener Torbogen (Aqueduct)
        ctx.beginPath(); ctx.rect(bx,top2,w,h);
        ctx.moveTo(bx+legW,hz); ctx.lineTo(bx+legW,sy); ctx.arc(cx,sy,ar,Math.PI,0,false); ctx.lineTo(bx+w-legW,hz); ctx.closePath();
        ctx.fill('evenodd'); ctx.stroke();
        ctx.fillStyle=rgA(curBg.sun,0.5*tw); ctx.fillRect(cx-1.5,top2-3,3,3);
      } else if(type==='temple'){ const colH=h*0.6, capY=hz-colH, n=4, gap=w/n;   // Antiker Tempel: Säulen + Giebel
        for(let i=0;i<n;i++){ const cw=Math.max(3,gap*0.4), sx=bx+i*gap+(gap-cw)/2; ctx.fillRect(sx,capY,cw,colH); ctx.strokeRect(sx,capY,cw,colH); }
        ctx.fillRect(bx-2,capY-5,w+4,6); ctx.strokeRect(bx-2,capY-5,w+4,6);   // Architrav
        ctx.beginPath(); ctx.moveTo(bx-2,capY-5); ctx.lineTo(cx,top); ctx.lineTo(bx+w+2,capY-5); ctx.closePath(); ctx.fill(); ctx.stroke();   // Giebel
        ctx.fillRect(bx-3,hz-3,w+6,3); ctx.fillStyle=rgA(curBg.sun,0.5*tw); ctx.beginPath(); ctx.arc(cx,capY-2,2,0,6.28); ctx.fill();
      } else if(type==='statue'){ const pedH=h*0.42, py=hz-pedH, figH=h-pedH;   // Vaporwave-Büste auf Sockel
        ctx.fillRect(cx-w*0.4,py,w*0.8,pedH); ctx.strokeRect(cx-w*0.4,py,w*0.8,pedH);
        ctx.beginPath(); ctx.moveTo(cx-w*0.3,py); ctx.lineTo(cx-w*0.18,py-figH*0.66); ctx.lineTo(cx+w*0.18,py-figH*0.66); ctx.lineTo(cx+w*0.3,py); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx,py-figH*0.8,w*0.18,0,6.28); ctx.fill(); ctx.stroke();
        ctx.fillStyle=rgA(curBg.sun,0.4*tw); ctx.fillRect(cx-1,py-figH*0.8-w*0.18-3,2,2);
      } else if(type==='stack'){ const lx=cx-w*0.5;   // Industrie-Schlot mit Glut + driftendem Rauch
        ctx.fillRect(lx,top,w,h); ctx.strokeRect(lx,top,w,h); ctx.fillRect(lx-2,top,w+4,4); ctx.strokeRect(lx-2,top,w+4,4);
        ctx.strokeStyle=rgA(curBg.grid,0.24); for(let yy=top+11;yy<hz-4;yy+=12){ ctx.beginPath(); ctx.moveTo(lx,yy); ctx.lineTo(lx+w,yy); ctx.stroke(); }
        ctx.fillStyle=rgA(curBg.sun,0.6+0.4*Math.sin(e*3+bx)); ctx.fillRect(cx-1.5,top-2,3,3);
        if(fxQ>0.6){ ctx.save(); ctx.globalCompositeOperation='lighter'; for(let s=0;s<3;s++){ const dy=(e*9+bx)%12, sy=top-8-s*10-dy, rr=4+s*3+dy*0.3, a=0.06*(1-s*0.28);
          const gg=ctx.createRadialGradient(cx,sy,1,cx,sy,rr); gg.addColorStop(0,rgA(curBg.sun,a)); gg.addColorStop(1,rgA(curBg.sun,0)); ctx.fillStyle=gg; ctx.fillRect(cx-rr,sy-rr,rr*2,rr*2); } ctx.restore(); }
      } else if(type==='step'){ let yy=hz, ww=w, sx2=bx, sh=h/3;   // Ziggurat / gestufter Bau
        for(let s=0;s<3;s++){ ctx.fillRect(sx2,yy-sh,ww,sh); ctx.strokeRect(sx2,yy-sh,ww,sh); yy-=sh; ww*=0.66; sx2=cx-ww/2; }
        ctx.fillStyle=rgA(curBg.sun,0.5*tw); ctx.fillRect(cx-1,hz-h-3,2,3);
      } else { ctx.fillRect(bx,top,w,h);   // Standard-Block mit Neon-Dachkante (Fensterlichter folgen im Bloom-Pass)
        ctx.beginPath(); ctx.moveTo(bx,top+0.5); ctx.lineTo(bx+w,top+0.5); ctx.stroke(); }
    }
    // atmosphärischer City-Bloom + blinkende Lichter (Fenster + rote Dach-Baken) – additiver Glow OHNE shadowBlur (mobil flüssig)
    ctx.save(); ctx.globalCompositeOperation='lighter';
    if(fxQ>0.6){ const bg=ctx.createLinearGradient(0,hz-58,0,hz+4); bg.addColorStop(0,rgA(curBg.grid,0)); bg.addColorStop(0.75,rgA(curBg.grid,0.05)); bg.addColorStop(1,rgA(curBg.sun,0.09)); ctx.fillStyle=bg; ctx.fillRect(0,hz-60,W,64); }
    const halo=fxQ>0.6, sun=curBg.sun;
    for(const b of sceneCity){ const bx=b[0],w=b[1],h=b[2],win=b[3],type=b[4],beac=b[5], top=hz-h, cx=bx+w/2;
      if(type==='block'&&win&&win.length){
        for(const wp of win){ const a=wp[2]>0?(Math.sin(e*2.4+wp[2])>0?0.7:0):(0.4+0.22*tw); if(a<0.05) continue; const X=bx+wp[0], Y=top+wp[1];
          if(halo){ ctx.fillStyle=rgA(sun,a*0.32); ctx.fillRect(X-1,Y-1,3.6,4.2); }   // weicher Halo (statt teurem shadowBlur)
          ctx.fillStyle=rgA(sun,a); ctx.fillRect(X,Y,1.6,2.2); } }
      if(beac>=0){ const on=Math.sin(e*2.4+beac)>0.3; if(on){ if(halo){ ctx.fillStyle='rgba(255,40,55,0.32)'; ctx.fillRect(cx-3,top-5,6,6); } ctx.fillStyle='#ff3a48'; ctx.fillRect(cx-1.5,top-3,3,3); }
        else { ctx.fillStyle='rgba(120,20,30,0.4)'; ctx.fillRect(cx-1.5,top-3,3,3); } } }
    ctx.restore();
    drawFogLine(hz); }
  // Tiefes Nebelband über den Gebäudefüßen → hohe Bauten ragen aus Wolken/Dunst. Weicher Gradient = „blurred Fläche" (ohne teuren Blur).
  function drawFogLine(hz){ const e=elapsed||0, m=curBg.mid;
    const haze=[Math.min(255,m[0]+34),Math.min(255,m[1]+26),Math.min(255,m[2]+48)];
    const g=ctx.createLinearGradient(0,hz-48,0,hz+10); g.addColorStop(0,rgA(haze,0)); g.addColorStop(0.55,rgA(haze,0.16)); g.addColorStop(1,rgA(haze,0.46));
    ctx.fillStyle=g; ctx.fillRect(0,hz-50,W,62);
    if(fxQ>0.6){ ctx.save(); ctx.globalCompositeOperation='lighter';   // driftende Wolkenpuffs für lebendigen Dunst
      for(let i=0;i<4;i++){ const px=(((i*W/4)+e*6*(i%2?1:-1))%(W+200)+W+200)%(W+200)-100, py=hz-9-(i%2)*7, rr=66+i*15;
        const gg=ctx.createRadialGradient(px,py,4,px,py,rr); gg.addColorStop(0,rgA(haze,0.07)); gg.addColorStop(1,rgA(haze,0)); ctx.fillStyle=gg; ctx.fillRect(px-rr,py-rr,rr*2,rr*2); }
      ctx.restore(); } }
  function drawSunReflection(hz,sc,pulse){ if(fxQ<0.6) return; ctx.save(); ctx.globalCompositeOperation='lighter'; const e=elapsed||0, H2=H-hz;
    for(let i=-2;i<=2;i++){ const off=i*30+Math.sin(e*2.2+i)*5, a=(0.13-Math.abs(i)*0.03)*(0.75+pulse*0.5); if(a<=0.005) continue;
      const g=ctx.createLinearGradient(0,hz,0,hz+H2*0.55); g.addColorStop(0,rgA(sc,a)); g.addColorStop(1,rgA(sc,0)); ctx.fillStyle=g; ctx.fillRect(W/2+off-7,hz,14,H2*0.55); } ctx.restore(); }
  function drawGrid(){ const hz=H*0.42,vx=W/2;
    // ---- Audio-reaktiver Sonnen-Puls: Musik-Amplitude (kontinuierlich) + Beat-Puls (scharfe Schläge) ----
    const hasAudio=analyser && opt.music>0;
    if(hasAudio){ analyser.getByteTimeDomainData(waveData);
      let s=0,c=0; for(let i=0;i<waveData.length;i+=4){ s+=Math.abs(waveData[i]-128); c++; }
      const lvl=Math.min(1,(s/c)/38); sunPulse+=(lvl-sunPulse)*0.2; }
    else sunPulse*=0.9;
    const beat=(beatPulse||0), pulse=Math.min(1.2,beat*0.7+sunPulse*0.85);            // Gesamt-Puls fürs Leuchten/Farbe
    const bp=1+beat*0.5+sunPulse*0.7+(overdrive?0.3:0);                                // bp = Beat + Musik-Energie (+Overdrive)
    const gc=curBg.grid, sc=curBg.sun;
    drawNebula(hz); drawMountains(hz); drawSkyline(hz);   // Himmel + Berge + Skyline HINTER der Sonne → Sonne & Sound-Visualizer bleiben mittig frei
    const pc=[Math.min(255,sc[0]+pulse*50),Math.min(255,sc[1]+pulse*62),Math.min(255,sc[2]+pulse*38)]; // Sonnenfarbe dezent heller/wärmer im Takt
    ctx.shadowBlur=0; ctx.strokeStyle=`rgba(${gc[0]|0},${gc[1]|0},${gc[2]|0},${Math.min(0.6,0.24*bp)})`; ctx.lineWidth=1;
    for(let i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(vx+i*40,hz);ctx.lineTo(vx+i*220,H);ctx.stroke();}
    const t=(elapsed||0)*0.5%1;
    // horizontale Linien als Wasser-Wellen vor der Skyline – Welle nimmt nach vorne zu, lineare Abwärtsbewegung (Flow) bleibt
    const wph=(elapsed||0)*1.6, ws=fxQ>0.5?12:24;
    for(let i=0;i<14;i++){ const f=(i+t)/14, y=hz+Math.pow(f,2.2)*(H-hz), amp=1+f*f*6, k=0.024;
      ctx.globalAlpha=Math.min(0.4,(0.08+f*0.2)*bp); ctx.beginPath();   // gedeckelt: in Overdrive/Madness nicht mehr grell (Lesbarkeit)
      for(let xx=0;xx<=W;xx+=ws){ const yy=y+Math.sin(xx*k+wph+f*2.5)*amp; xx?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy); } ctx.stroke(); } ctx.globalAlpha=1;
    // weicher Halo um die Sonne – dezent, nur leicht im Takt (kein großer Schleier!)
    const hr=200*(0.95+pulse*0.12), ha=Math.min(0.5,0.3+pulse*0.13);
    const sg=ctx.createRadialGradient(W/2,hz,4,W/2,hz,hr); sg.addColorStop(0,`rgba(${sc[0]|0},${sc[1]|0},${sc[2]|0},${ha})`); sg.addColorStop(1,`rgba(${sc[0]|0},${sc[1]|0},${sc[2]|0},0)`); ctx.fillStyle=sg; ctx.fillRect(W/2-hr,hz-hr,hr*2,hr*2);
    // Sonne auf Offscreen-Canvas: SOLIDE Scheibe mit Vertikalverlauf + ausgestanzte Streifen (destination-out)
    const sr=120, sa=Math.min(1,0.85*bp), SS=sr*2, LO=80;
    if(!sunOff){ sunOff=document.createElement('canvas'); sunOff.width=SS; sunOff.height=SS; sunOffCtx=sunOff.getContext('2d');
      waveOff=document.createElement('canvas'); waveOff.width=SS; waveOff.height=SS; waveOffCtx=waveOff.getContext('2d');
      sunLo=document.createElement('canvas'); sunLo.width=LO; sunLo.height=LO; sunLoCtx=sunLo.getContext('2d'); }
    const so=sunOffCtx; so.clearRect(0,0,SS,SS);
    so.save(); so.beginPath(); so.arc(sr,sr,sr,0,6.28); so.clip();
    const dg=so.createLinearGradient(0,0,0,SS);
    dg.addColorStop(0,`rgba(255,244,196,${sa})`);                                                  // heller Kern oben
    dg.addColorStop(0.5,`rgba(${pc[0]|0},${pc[1]|0},${pc[2]|0},${sa})`);                            // pulsende Sonnenfarbe
    dg.addColorStop(1,`rgba(${Math.min(255,sc[0]+30)|0},${(sc[1]*0.45)|0},${(sc[2]*0.7)|0},${sa})`); // satter Richtung Horizont
    so.fillStyle=dg; so.fillRect(0,0,SS,SS);
    so.globalCompositeOperation='destination-out';                                                // Streifen ausstanzen → durchsichtige Lücken
    for(let i=0;i<7;i++){ const yy=sr+6+i*i*3.4; if(yy>SS) break; so.fillRect(0,yy,SS,2.4+i*1.7); }
    so.restore();
    // ---- Audio-Visualizer: bunte Wellenform auf EIGENER Ebene (nur sie wird gebloomt) ----
    const wo=waveOffCtx; wo.clearRect(0,0,SS,SS); const hasWave=hasAudio;            // Visualizer IMMER an – bei Lag nur gröber, nie aus (Daten oben schon geholt)
    if(hasWave){
      const layers=fxQ>0.75?3:(fxQ>0.5?2:1), stepN=fxQ>0.75?2:(fxQ>0.5?3:5);        // unter Last: weniger Layer + gröbere Abtastung
      wo.save(); wo.beginPath(); wo.arc(sr,sr,sr,0,6.28); wo.clip();
      wo.globalCompositeOperation='lighter'; wo.lineWidth=fxQ>0.5?2.7:3.6; wo.lineJoin='round'; wo.lineCap='round'; // gröber = dickere Linie → bleibt gut sichtbar
      const N=waveData.length, midY=sr, amp=sr*0.5*(1+beat*0.35), eh=(elapsed||0)*70;   // begrenzte Amplitude → Welle bleibt IM Sonnenkreis (nicht weggeclippt)
      for(let lay=0;lay<layers;lay++){ const hue=(eh+lay*70)%360;
        wo.strokeStyle=`hsla(${hue},100%,${66-lay*5}%,${0.5-lay*0.09})`;
        wo.beginPath();
        for(let i=0;i<N;i+=stepN){ const x=i/(N-1)*SS, v=(waveData[i]-128)/128, y=midY+v*amp+(lay-1)*6; i?wo.lineTo(x,y):wo.moveTo(x,y); }
        wo.stroke(); }
      wo.restore();
    }
    const dx=W/2-sr, dy=hz-sr;
    ctx.save();
    ctx.drawImage(sunOff,dx,dy);                                                                   // Sonne scharf – KEIN Bloom drauf
    if(hasWave){ ctx.imageSmoothingEnabled=true; ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha=1; ctx.drawImage(waveOff,dx,dy);                                             // scharfe Welle
      sunLoCtx.clearRect(0,0,LO,LO); sunLoCtx.drawImage(waveOff,0,0,LO,LO);                         // Downscale NUR der Welle
      ctx.globalAlpha=0.7; ctx.drawImage(sunLo,dx-12,dy-12,SS+24,SS+24);                            // weicher Glow nur um die Welle
      ctx.globalAlpha=0.4; ctx.drawImage(sunLo,dx-24,dy-24,SS+48,SS+48); }
    ctx.restore();
    drawSunReflection(hz,sc,pulse);   // Sonnen-Reflexion auf dem Boden (Skyline wird HINTER der Sonne gezeichnet)
  }

  // ---------- Game Over ----------
  // Zünftiger Abgang: bildfüllende Explosion + Nuklearblitz + Feuer-Konfetti (+ Haptik/Akustik)
  // Explosions-Varianten: jeder Abgang sieht/klingt etwas anders
  const DEATHVARIANTS=[
    {cols:['#ff3b1a','#ff7a1a','#ffd24d','#ffe600','#ffffff'], ring:'#ffffff', glow:'#ff7a1a'},   // Feuer
    {cols:['#ff2e88','#c45bff','#7a5bff','#19f0ff','#ffffff'], ring:'#e6b3ff', glow:'#c45bff'},   // Plasma
    {cols:['#7cff2e','#2effc0','#b6ff3b','#eaffd0','#ffffff'], ring:'#caffd0', glow:'#7cff2e'},   // Toxisch
    {cols:['#19f0ff','#8fe8ff','#bdefff','#caffff','#ffffff'], ring:'#ffffff', glow:'#19f0ff'},   // Eis
    {cols:['#ffd23f','#ff9a2e','#ff5edb','#ffffff','#fff7c0'], ring:'#fff7c0', glow:'#ff9a2e'}    // Sonnensturm
  ];
  function bigDeathBlast(x,y){ const diag=Math.hypot(W,H), V=pick(DEATHVARIANTS), ri=(a,b)=>(rand(a,b)|0);
    deathT=0; deathX=x; deathY=y; deathGather=false; deathGlow=V.glow; overShown=false;   // neuer Abgang → Canvas-Spott wieder erlaubt, bis das Panel erscheint
    deathFlash=1; flash=0.95; flashColor='#ffffff'; shake=rand(42,54);
    // ganzes Spielfeld detoniert mit
    for(const o of obstacles){ pixelBurst(o.cx,o.cy,o.color,o.maxHp||2); spawnGibs(o.cx,o.cy,4,V.cols,300,520); }
    obstacles.length=0; lasers.length=0; ebullets.length=0; bullets.length=0;
    // bildfüllende Schockwelle + Feuerball (Größe/Anzahl/Farbe variiert)
    if(novas.length>14) novas.length=0;
    novas.push({x,y,r0:rand(24,40),rMax:diag*rand(1.0,1.22),t:0,life:rand(0.5,0.62),col:V.ring,fill:true});
    for(let i=0;i<5;i++) pixelBurst(x+rand(-36,36),y+rand(-36,36),pick(V.cols),ri(11,16));
    spawnParticles(x,y,V.glow,ri(54,72),rand(480,580)); spawnParticles(x,y,V.cols[2],ri(34,46),rand(380,480)); spawnParticles(x,y,'#ffffff',28,640);
    spawnGibs(x,y,ri(42,62),V.cols,rand(520,620),560);   // Konfetti
    sfxBoom(); sfxDeathBlast(rand(0.8,1.28)); vibe([ri(160,220),50,90,40,ri(140,200),60,ri(200,260)]);
    // gestaffelte Nachbeben-Ringe + Konfetti-Regen (Anzahl/Timing variiert)
    setTimeout(()=>{ if(novas.length<18) novas.push({x,y,r0:rand(8,14),rMax:diag,t:0,life:rand(0.66,0.8),col:V.glow,fill:true}); shake=Math.max(shake,28); beep(ri(58,76),0.5,'sawtooth',0.4,-44); },90+ri(0,50));
    if(Math.random()<0.6) setTimeout(()=>{ if(novas.length<18) novas.push({x,y,r0:6,rMax:diag*0.88,t:0,life:0.8,col:V.cols[1]}); },170+ri(0,60));
    setTimeout(()=>{ spawnGibs(x,rand(H*0.08,H*0.26),ri(28,40),V.cols,rand(440,520),540); deathFlash=Math.max(deathFlash,0.45); },ri(200,260));
    setTimeout(()=>{ for(let k=0;k<4;k++) spawnGibs(rand(W*0.15,W*0.85),rand(-30,H*0.18),ri(14,20),V.cols,rand(380,440),560); },ri(460,560)); }
  // ---------- Anonyme Telemetrie (Balancing/Tuning) – kein PII; lokales Log immer, Cloud-Versand nur opt-in + URL gesetzt ----------
  const GAME_VER='v374';   // mit der service-worker-CACHE-Version synchron halten (taucht in der Telemetrie als `ver` auf)
  const TELEMETRY_URL='https://thronerush-telemetry.hannes-75b.workers.dev/';   // Cloudflare-Worker → D1. Versand greift nur bei Opt-in (Einwilligungsabfrage beim Start). Siehe telemetry-worker/README.md.
  function telemetryCid(){ try{ let c=localStorage.getItem('thronerush_cid'); if(!c){ c=Date.now().toString(36)+Math.random().toString(36).slice(2,10); localStorage.setItem('thronerush_cid',c); } return c; }catch(e){ return 'anon'; } }
  function runRecord(earned){
    let upN=0; for(const k in (upgradeCounts||{})) upN+=upgradeCounts[k]||0;   // gewählte Upgrades gesamt
    return { v:2, ver:GAME_VER, cid:telemetryCid(), ts:Date.now(),
    mode:mode, diff:meta.diff||0, daily:daily?1:0,
    lvl:level||1, score:Math.round(score||0), boss:runBosses||0, bossReached:bossNumber||1, won:wonThisRun?1:0,
    durS:Math.round(elapsed||0), hits:runHits||0, near:nearCount||0, perfect:runPerfect||0, orbs:runOrbs||0, combo:Math.round(runMaxMult||1),
    dps:Math.round((gunDps()||0)*10)/10, surv:Math.round((pwrSurv()||0)*10)/10,
    wpn:Object.keys(arsenal.w||{}), syn:(activeSyn||[]).slice(), ups:Object.keys(upgradeCounts||{}), runUp:upN, coins:Math.round(earned||0),
    chipsBal:Math.round(meta.chips||0), spLeft:skillPts||0, revive:runContinues||0,
    director:Math.round((director||0)*10)/10, jumps:runJumps||0, onBeat:0, loot:runLoot||0,
    idleMax:Math.round((runIdleMax||0)*10)/10, idlePct:Math.round(((runIdleAcc||0)/Math.max(1,elapsed||0))*1000)/10,
    death:(wonThisRun?'':(deathCause||'unknown')) }; }
  function sendTelemetry(rec){ try{ if(!TELEMETRY_URL||!opt.telemetry) return;
    const body=JSON.stringify(rec);
    if(navigator.sendBeacon){ try{ if(navigator.sendBeacon(TELEMETRY_URL,new Blob([body],{type:'text/plain'}))) return; }catch(e){} }   // bevorzugt: zuverlässig auch beim Game-Over/Entladen, kein CORS-Preflight (text/plain), Worker parst JSON
    fetch(TELEMETRY_URL,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,mode:'cors'}).catch(()=>{}); }catch(e){} }   // Fallback für Browser ohne sendBeacon
  function recordRun(earned){ try{ const rec=runRecord(earned);
    let log=[]; try{ log=JSON.parse(localStorage.getItem('thronerush_tlog'))||[]; }catch(e){} if(!Array.isArray(log)) log=[];
    log.push(rec); if(log.length>150) log=log.slice(-150); try{ localStorage.setItem('thronerush_tlog',JSON.stringify(log)); }catch(e){}
    sendTelemetry(rec); }catch(e){} }

  // ===== Leaderboard (Server) =====
  // Eigener, EXPLIZITER Opt-in: der Score wandert nur bei „Score speichern" + selbst gewähltem Nickname an den Server.
  // Endpunkte am selben Worker wie die Telemetrie: POST /score, GET /leaderboard. cid = anonyme Telemetrie-ID.
  let lastRunLB=null, lbReturn='start', lbTab='normal', nickCb=null;
  const lbEsc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const cleanNick=s=>(s||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,16);
  const getNick=()=>cleanNick(opt.nick||'');
  function setNick(s){ opt.nick=cleanNick(s); saveOpt(); }
  function postScore(p,cb){ try{
      if(!TELEMETRY_URL){ cb&&cb(false,'nourl'); return; }
      const nick=getNick(); if(!nick){ cb&&cb(false,'nonick'); return; }
      const body=JSON.stringify({nick, cid:telemetryCid(), ver:GAME_VER, score:Math.round(p.score||0), mode:p.mode, daily:p.daily?1:0, dailyDate:p.dailyDate||'', lvl:p.lvl||0, boss:p.boss||0});
      fetch(TELEMETRY_URL+'score',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,mode:'cors'})
        .then(x=>x.json()).then(j=>{ cb&&cb(!!(j&&j.ok), (j&&j.ok)?'ok':'err', j); })
        .catch(()=>{ cb&&cb(false,'neterr'); });
    }catch(e){ cb&&cb(false,'err'); } }
  function submitScore(cb){ const r=lastRunLB; if(!r||!r.eligible){ cb&&cb(false,'inelig'); return; } postScore(r,cb); }
  // Lokalen Bestwert des aktuellen Tab-Boards holen (Daily nur, wenn er von heute ist)
  function lbLocalBest(){ if(lbTab==='daily'){ return (best.dailyDate===dailyLabel())?(best.daily||0):0; } return best[lbTab]||0; }

  // --- Nickname-Dialog ---
  function askNick(done){ nickCb=done||null; const inp=document.getElementById('nickInput');
    const set=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
    set('nickTitleEl',t('nickTitle')); set('nickHintEl',t('nickHint'));
    set('nickSaveBtn',t('nickSave')); set('nickCancelBtn',t('nickCancel'));
    if(inp){ inp.value=getNick(); inp.placeholder=t('nickPh'); }
    document.getElementById('nickPrompt').classList.remove('hidden');
    try{ beep(660,0.05,'square',0.18); }catch(e){} if(inp){ try{ inp.focus(); }catch(e){} } }
  function nickConfirm(){ const inp=document.getElementById('nickInput'), v=cleanNick(inp?inp.value:'');
    if(!v){ if(inp){ inp.classList.add('shake'); setTimeout(()=>inp.classList.remove('shake'),420);} return; }
    setNick(v); document.getElementById('nickPrompt').classList.add('hidden'); const cb=nickCb; nickCb=null; try{ beep(740,0.06,'square',0.2);}catch(e){} if(cb) cb(true); }
  function nickCancel(){ document.getElementById('nickPrompt').classList.add('hidden'); const cb=nickCb; nickCb=null; if(cb) cb(false); }

  // --- Over-Screen: Score speichern ---
  function onSaveScore(){ const b=document.getElementById('saveScoreBtn'); if(!b) return;
    if(!lastRunLB||!lastRunLB.eligible) return;
    const go=()=>{ b.disabled=true; b.textContent=t('lbSaving');
      submitScore((ok,reason,j)=>{ const bb=document.getElementById('saveScoreBtn');
        if(ok){ lastRunLB.saved=true; if(bb){ bb.textContent=t('lbSaved')+((j&&j.rank)?(' · #'+j.rank):''); bb.disabled=true; }
          try{ beep(880,0.1,'square',0.3); }catch(e){} setTimeout(()=>openLeaderboard('over'),650); }
        else { if(bb){ bb.disabled=false; bb.textContent=(reason==='neterr'||reason==='err')?t('lbNetErr'):t('lbSave'); } } }); };
    if(!getNick()) askNick(ok=>{ if(ok) go(); }); else go(); }

  // --- Leaderboard-Ansicht ---
  function openLeaderboard(from){ lbReturn=from||'start'; lbTab='normal';   // nur noch ein Modus → ein globales Board (keine Tabs)
    const fr=document.getElementById(lbReturn); if(fr) fr.classList.add('hidden');
    document.getElementById('lbTitleEl').textContent=t('lbTitle');
    document.getElementById('lbBackBtn').textContent=t('lbBack');
    document.getElementById('leaderboard').classList.remove('hidden');
    loadLbBoard(); updateLbBest(); try{ beep(660,0.06,'square',0.2);}catch(e){} }
  function closeLeaderboard(){ document.getElementById('leaderboard').classList.add('hidden');
    const fr=document.getElementById(lbReturn||'start'); if(fr) fr.classList.remove('hidden'); }
  function renderLbTabs(){ const host=document.getElementById('lbTabs'); if(!host) return;
    const tabs=[['normal',modeLabel('normal')],['hardcore',modeLabel('hardcore')],['daily',t('lbDailyTab')]];
    host.innerHTML=''; for(const [key,label] of tabs){ const b=document.createElement('button');
      b.className='lbTab'+(lbTab===key?' on':''); b.textContent=label;
      b.addEventListener('click',()=>{ if(lbTab===key) return; lbTab=key; renderLbTabs(); loadLbBoard(); updateLbBest(); });
      host.appendChild(b); } }
  // „Meinen Rekord eintragen": trägt den lokalen Bestwert des aktuellen Boards ein (auch ohne neuen Run)
  function updateLbBest(){ const b=document.getElementById('lbSubmitBest'); if(!b) return;
    const v=lbLocalBest();
    if(!v||!TELEMETRY_URL){ b.style.display='none'; return; }
    b.style.display=''; b.disabled=false; b.textContent='📤 '+t('lbSubmitBest')+' ('+fmt(v)+')'; }
  function onSubmitBest(){ const v=lbLocalBest(); if(!v) return; const b=document.getElementById('lbSubmitBest');
    const go=()=>{ if(b){ b.disabled=true; b.textContent=t('lbSaving'); }
      const p = lbTab==='daily' ? {score:v,mode:'normal',daily:1,dailyDate:dailyLabel()} : {score:v,mode:lbTab,daily:0};
      postScore(p,(ok,reason,j)=>{ if(ok){ try{ beep(880,0.1,'square',0.3);}catch(e){} loadLbBoard();
          if(b){ b.textContent=t('lbSaved')+((j&&j.rank)?(' · #'+j.rank):''); b.disabled=true; } }
        else { if(b){ b.disabled=false; updateLbBest(); } } }); };
    if(!getNick()) askNick(ok=>{ if(ok) go(); }); else go(); }
  function loadLbBoard(){ const listEl=document.getElementById('lbList'), meEl=document.getElementById('lbMe');
    if(meEl) meEl.textContent='';
    if(!listEl) return;
    if(!TELEMETRY_URL){ listEl.innerHTML='<div class="lbErr">'+t('lbOff')+'</div>'; return; }
    listEl.innerHTML='<div class="lbLoading">'+t('lbLoading')+'</div>';
    const daily=lbTab==='daily', mode=daily?'normal':lbTab;
    let u=TELEMETRY_URL+'leaderboard?scope='+(daily?'daily':'all')+'&mode='+mode+'&limit=50&cid='+encodeURIComponent(telemetryCid());
    if(daily) u+='&date='+dailyLabel();
    const myTab=lbTab;
    fetch(u,{mode:'cors'}).then(x=>x.json()).then(j=>{ if(myTab!==lbTab) return;   // Tab inzwischen gewechselt
        if(!j||!j.ok){ listEl.innerHTML='<div class="lbErr">'+t('lbError')+'</div>'; return; } renderLbList(j); })
      .catch(()=>{ if(myTab===lbTab) listEl.innerHTML='<div class="lbErr">'+t('lbError')+'</div>'; }); }
  function renderLbList(j){ const listEl=document.getElementById('lbList'), meEl=document.getElementById('lbMe');
    if(!listEl) return;
    if(!j.list||!j.list.length){ listEl.innerHTML='<div class="lbEmpty">'+t('lbEmpty')+'</div>'; }
    else { listEl.innerHTML=j.list.map(r=>{ const medal=r.rank===1?'🥇':r.rank===2?'🥈':r.rank===3?'🥉':r.rank;
        const cls='lbRow'+(r.rank<=3?(' top top'+r.rank):'')+((j.me&&j.me.rank===r.rank)?' me':'');
        return '<div class="'+cls+'"><span class="lbR">'+medal+'</span><span class="lbN">'+lbEsc(r.nick)+'</span><span class="lbS">'+fmt(r.score)+'</span></div>'; }).join(''); }
    if(meEl){ meEl.innerHTML=(j.me?('<span class="lbYouTag">'+t('lbYourRank')+'</span> #'+j.me.rank+' · '+fmt(j.me.score)):''); } }
  function exportTelemetry(done){ let arr=[]; try{ arr=JSON.parse(localStorage.getItem('thronerush_tlog')||'[]'); }catch(e){} if(!Array.isArray(arr)) arr=[]; const json=JSON.stringify(arr);
    const ok=()=>done&&done(arr.length,true), fail=()=>{ try{ prompt('Telemetrie-JSON (kopieren):', json); }catch(_){ } done&&done(arr.length,false); };
    try{ if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(ok,fail); else fail(); }catch(e){ fail(); } }
  function gameOver(){ state=S.OVER; clearRun(); sfxGameOver(); duckMusic(2.4); bigDeathBlast(player.x,player.y);
    const rec=score>curBest(); lastRunRecord=rec; if(rec){ setBest(score); saveScores();
      for(let i=0;i<5;i++) pixelBurst(rand(W*0.2,W*0.8),rand(H*0.2,H*0.55),pick(['#ffe600','#ff2e88','#19f0ff','#2effc0']),8);
      setTimeout(()=>{beep(660,0.1,'square',0.3);},120); setTimeout(()=>{beep(880,0.1,'square',0.3);},260); setTimeout(()=>{beep(1175,0.18,'square',0.35);},400); }
    accrueChips();                                                         // Score/Near-Chips final live nachbuchen (bereits größtenteils im Run gutgeschrieben)
    const tail=Math.max(0,Math.round((wonThisRun?250:0)*chipMult()*diffChip));   // Sieg-Bonus (Boss-Chips laufen live über awardCoins)
    meta.chips=(meta.chips||0)+tail;
    const earned=runChipsPaid+runChipsEarned+tail;                         // Gesamt-Chips dieses Runs (Trickle + Events + Sieg)
    addStat('orbs',runOrbs); addStat('near',nearCount); addStat('perfect',runPerfect); addStat('bosses',runBosses); addStat('runs',1); addStat('chipsTotal',earned);
    meta.stats=meta.stats||{}; if(runMaxMult>statN('maxCombo')) meta.stats.maxCombo=runMaxMult; if(bossNumber>statN('maxBoss')) meta.stats.maxBoss=bossNumber;
    if((level||1)>statN('maxLevel')) meta.stats.maxLevel=level||1;
    const msRes=checkMilestones();   // neu erreichte Meilensteine → Chip-Belohnung
    if(statN('orbs')>=1000) unlockAch('orbs1000'); if(statN('chipsTotal')>=10000) unlockAch('chips10k');
    recordRun(earned);   // anonyme Telemetrie (lokales Log + optional Cloud)
    // Leaderboard: Run-Snapshot für „Score speichern" (Zen zählt nicht; braucht Server-URL). Werte hier noch gültig (Reset erst beim nächsten Start).
    lastRunLB={ score:Math.round(score||0), mode:mode, daily:daily?1:0, dailyDate:daily?dailyLabel():'', lvl:level||1, boss:runBosses||0, saved:false, eligible:(mode!=='zen' && !!TELEMETRY_URL) };
    { const ssb=document.getElementById('saveScoreBtn'); if(ssb){ ssb.disabled=false; ssb.textContent=t('lbSave'); ssb.style.display=lastRunLB.eligible?'':'none'; } }
    // Übrige Skillpunkte gehen NICHT verloren → werden in Chips umgewandelt (Boss-Beute fühlt sich nie umsonst an)
    const spLeft=Math.max(0,skillPts|0), spChips=spLeft*40;
    if(spChips){ meta.chips=(meta.chips||0)+spChips; }
    // Roguelite-Reset: Run-Build (ausgerüstete Waffen/Forks/Synergien/Skillpunkte) verfällt. Coin-Freischaltungen (Baupläne/Forks/Synergien) + Start-Boni bleiben.
    meta.loadout=null; meta.spBought=0; meta.sp=starterSP();
    saveMeta(); updateMenuChips();
    document.getElementById('hud').classList.add('hidden'); showCockpit(false);
    finalScore.textContent=Math.round(score); finalBest.textContent=curBest(); overModeEl.textContent=(daily?(t('modeDaily')+' · '+dailyLabel()):modeLabel(mode))+' · '+(DIFFS[meta.diff||0]||DIFFS[0]).name;
    chipsEarnedEl.textContent=(wonThisRun?t('clearedTag'):'')+'🪙 +'+earned+'  ·  '+t('balance')+' 🪙 '+(meta.chips||0);
    const rs=document.getElementById('runSummary');
    if(rs){ let h=t('reached')+' '+t('level')+' '+(level||1)+'  ·  '+(runBosses||0)+' '+t('bosses')+'  ·  '+t('rankLbl')+' '+(P('ranks')[rankIdx]||''); const _md=missions.filter(m=>m.done).length; if(missions.length) h+='  ·  🎯 '+_md+'/'+missions.length; if(spChips) h+='  ·  💠'+spLeft+' → 🪙+'+spChips; rs.textContent=h; }
    const nu=document.getElementById('nextUnlock'), nx=nextUnlock();
    if(nu){ if(nx){ const have=meta.chips||0, pct=Math.max(3,Math.min(100,Math.round(have/nx.cost*100))), aff=have>=nx.cost;
        nu.innerHTML='<div class="nuhead"><span class="nul">'+t('nextUp')+'</span> '+nx.ico+' <b>'+nx.name+'</b> '+(aff?'<span class="nuok">✓ '+t('affordable')+'</span>':'<span class="nugap">'+fmt(nx.cost-have)+' '+t('toGo')+'</span>')+'</div><div class="nubar'+(aff?' full':'')+'"><i style="width:'+pct+'%"></i></div>'; }
      else nu.innerHTML=''; }
    const mh=document.getElementById('milestoneHit');
    if(mh){ if(msRes.hit.length){ mh.innerHTML='<span class="mhl">🎯 '+t('msReached')+'</span> '+msRes.hit.length+'× · <b>🪙 +'+msRes.chips+'</b>'; mh.classList.remove('hidden'); } else mh.classList.add('hidden'); }   // kompakt: Anzahl + Chips statt voller Liste (war beim Durchspielen eine 4-zeilige Wand)
    deathMsg=pick(P('insults')); insultEl.textContent=deathMsg; if(quipEl){ quipEl.style.display=''; quipEl.textContent=pick(P('quips')); }   // frecher Spruch bleibt – nur die Meilenstein-Wand + das Canvas-Geist-Duplikat waren der Clutter
    newrecEl.style.display=rec?'block':'none';   // deathMsg materialisiert sich auch im Canvas-Abgang
    overShown=false; setTimeout(()=>{ overShown=true; document.getElementById('over').classList.remove('hidden'); },1600);   // Explosion erst auswüten lassen; overShown stoppt das Canvas-Spott-Duplikat
  }

  // ---------- Teilen: Score-Karte als PNG ----------
  function buildShareCanvas(){
    const c=document.createElement('canvas'); c.width=1080; c.height=1080; const x=c.getContext('2d');
    const g=x.createLinearGradient(0,0,0,1080); g.addColorStop(0,'#180230'); g.addColorStop(.55,'#1a0a3a'); g.addColorStop(1,'#08010f');
    x.fillStyle=g; x.fillRect(0,0,1080,1080);
    // Perspektiv-Grid unten
    x.strokeStyle='rgba(255,46,136,0.35)'; x.lineWidth=2;
    for(let i=-10;i<=10;i++){ x.beginPath(); x.moveTo(540+i*44,700); x.lineTo(540+i*260,1080); x.stroke(); }
    for(let i=0;i<12;i++){ const f=i/12, y=700+Math.pow(f,2.2)*380; x.globalAlpha=0.12+f*0.3; x.beginPath(); x.moveTo(0,y); x.lineTo(1080,y); x.stroke(); }
    x.globalAlpha=1; x.textAlign='center';
    x.fillStyle='#fff'; x.shadowColor='#ff2e88'; x.shadowBlur=40; x.font='900 100px Orbitron, sans-serif';
    x.fillText('THRONERUSH',540,150);
    x.shadowBlur=0; x.fillStyle='#9a86c9'; x.font='700 30px Orbitron, sans-serif';
    x.fillText(daily?(t('dailyLbl')+' · '+dailyLabel()):modeLabel(mode),540,200);
    // Zuletzt getroffener Meme-Boss (viraler Aufhänger) bzw. „durchgespielt"
    if(wonThisRun){ x.fillStyle='#ffe600'; x.shadowColor='#ffe600'; x.shadowBlur=22; x.font='800 40px Orbitron, sans-serif'; x.fillText('🏆 '+t('shareCleared'),540,256); x.shadowBlur=0; }
    else if(lastBossName){ x.fillStyle='#ff5ea8'; x.shadowColor='#ff2e88'; x.shadowBlur=18; x.font='800 38px Orbitron, sans-serif'; x.fillText('💀 '+lastBossName,540,256); x.shadowBlur=0; }
    // Großer Score
    x.fillStyle='#19f0ff'; x.shadowColor='#19f0ff'; x.shadowBlur=44; x.font='900 172px Orbitron, sans-serif';
    x.fillText(String(Math.round(score)),540,430);
    x.shadowBlur=0; x.fillStyle='#ffe600'; x.font='700 34px Orbitron, sans-serif'; x.fillText(t('pointsBig'),540,478);
    if(lastRunRecord){ x.fillStyle='#ffe600'; x.shadowColor='#ffe600'; x.shadowBlur=18; x.font='900 36px Orbitron, sans-serif'; x.fillText(t('newRec'),540,524); x.shadowBlur=0; }
    else { x.fillStyle='#c9b9ef'; x.font='400 30px "Space Mono", monospace'; x.fillText(t('record')+' '+curBest(),540,520); }
    // Run-Story-Strip: Level · Bosse · Top-Combo
    x.fillStyle='#cdb9ff'; x.font='700 30px Orbitron, sans-serif';
    x.fillText('LEVEL '+(level||1)+'    🌊 '+(runBosses||0)+'    COMBO x'+Math.round(runMaxMult||1),540,572);
    // Fortschrittsbalken zum Boss-Finale („fast geschafft")
    { const fin=Math.max(1,finalNum()), prog=wonThisRun?1:Math.max(0.02,Math.min(1,(runBosses||0)/fin)), bw=620, bx=540-bw/2, by=600;
      x.fillStyle="rgba(255,255,255,.09)"; rrect(x,bx,by,bw,16,8); x.fill();
      const gb=x.createLinearGradient(bx,0,bx+bw,0); gb.addColorStop(0,'#19f0ff'); gb.addColorStop(1,'#7c5bff');
      x.fillStyle=gb; rrect(x,bx,by,Math.max(16,bw*prog),16,8); x.fill();
      x.fillStyle='#9a86c9'; x.font='400 24px "Space Mono", monospace'; x.fillText(Math.round(prog*100)+'% '+t('shareGoal'),540,652); }
    // genutztes Raumschiff GROSS
    try{ let up=0; for(const k in upgradeCounts) up+=upgradeCounts[k]||0; up+=ownedCount()*2;
      const nCan=Math.min(8, ownedCount()+((wpn&&wpn.blaster)?Math.max(0,wpn.blaster.bolts-1):0));
      const S=buildShipSprite(64,up,nCan);
      if(S&&S.cv&&S.cv.width){ const sc=Math.min(250/S.cv.height,560/S.cv.width), dw=S.cv.width*sc, dh=S.cv.height*sc, cyS=812;
        x.save(); x.shadowColor=S.acc||'#19f0ff'; x.shadowBlur=55; x.imageSmoothingEnabled=false; x.drawImage(S.cv,540-dw/2,cyS-dh/2,dw,dh); x.restore();
        if(meta.skin==='custom'){ const s=activeShip(); if(s&&s.name){ x.shadowBlur=0; x.fillStyle='#9be7ff'; x.font='700 28px Orbitron, sans-serif'; x.fillText('« '+s.name+' »',540,Math.min(946,cyS+dh/2+30)); } } }
    }catch(e){}
    // Spott-Spruch (passt zum Over-Screen) + Call-to-Action + URL
    if(deathMsg){ x.shadowBlur=0; x.fillStyle='#ff9ec4'; x.font='italic 700 30px "Space Mono", monospace'; x.fillText('„'+deathMsg+'"',540,966); }
    x.fillStyle='#ff2e88'; x.shadowColor='#ff2e88'; x.shadowBlur=18; x.font='900 46px Orbitron, sans-serif'; x.fillText(t('beatMe'),540,1018);
    x.shadowBlur=0; x.fillStyle='#5b4a85'; x.font='400 28px "Space Mono", monospace'; x.fillText('hannespix.github.io/thronerush',540,1058);
    return c;
  }
  // kleiner Rundrechteck-Helfer für die Share-Karte (eigener Kontext, NICHT der globale ctx → eigener Name vermeidet Kollision mit rr())
  function rrect(g2,bx,by,bw,bh,r){ g2.beginPath(); g2.moveTo(bx+r,by); g2.arcTo(bx+bw,by,bx+bw,by+bh,r); g2.arcTo(bx+bw,by+bh,bx,by+bh,r); g2.arcTo(bx,by+bh,bx,by,r); g2.arcTo(bx,by,bx+bw,by,r); g2.closePath(); }
  function shareScore(){
    let blobUrl=null;
    try{
      const c=buildShareCanvas();
      const text='THRONERUSH'+(daily?(' · '+t('dailyLbl')+' '+dailyLabel()):(' · '+modeLabel(mode)))+': '+Math.round(score)+t('shareScore')+'https://hannespix.github.io/thronerush/';
      c.toBlob(blob=>{ if(!blob) return;
        const file=new File([blob],'thronerush-'+Math.round(score)+'.png',{type:'image/png'});
        if(navigator.canShare && navigator.canShare({files:[file]})){
          navigator.share({files:[file],text,title:'THRONERUSH'}).catch(()=>{});
        } else {
          blobUrl=URL.createObjectURL(blob);
          const a=document.createElement('a'); a.href=blobUrl; a.download=file.name; document.body.appendChild(a); a.click(); a.remove();
          try{ if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(()=>{}); }catch(e){}
          setTimeout(()=>{ try{ URL.revokeObjectURL(blobUrl); }catch(e){} },5000);
        }
      },'image/png');
    }catch(e){}
  }

  // ---------- Werkstatt (Meta-Shop) ----------
  function updateMenuChips(){ if(menuChipsEl) menuChipsEl.textContent='🪙 '+fmt(meta.chips)+((meta.won)?('  ·  🏆 '+meta.won):''); }
  // Persistentes Coin-Badge: auf allen Overlay-Screens außer Hauptmenü (#start) / Werkstatt (#shop, zeigt Guthaben selbst) sichtbar
  const BADGE_SCREENS=['over','upgrade','pause','settings','ach','statusView','howto'];   // NICHT auf Hub(arsenalView)/Werkstatt/Editor/Coinshop: dort ist man schon im Shop-Fluss → Badge wäre redundant/Schleifen-Risiko
  let coinBadgeEl=null;
  function visibleBadgeScreen(){ for(const id of BADGE_SCREENS){ const e=document.getElementById(id); if(e && !e.classList.contains('hidden')) return id; } return null; }
  function syncCoinBadge(){ const el=coinBadgeEl||(coinBadgeEl=document.getElementById('coinBadge')); if(!el) return;
    const scr=visibleBadgeScreen();
    if(scr){ const txt='🪙 '+fmt(meta.chips); if(el._t!==txt){ el._t=txt; el.textContent=txt; } el.dataset.from=scr; el.classList.remove('hidden'); }
    else el.classList.add('hidden'); }
  let shopFrom='start';                                  // Werkstatt: aus Menü, Game-Over ODER mitten im Run (Upgrade-/Skill-Screen)
  function runShopLabel(){ return '🛠️ '+t('workshop')+' 🪙 '+fmt(meta.chips); }
  function updateRunShopBtns(){ const a=document.getElementById('upgradeShopBtn');
    if(a) a.textContent=runShopLabel(); }
  function openShop(from){ setShopHost('shop'); const run=(from==='upgrade'||from==='arsenalView'||from==='pause');
    // beliebigen sichtbaren Overlay-Screen als Rückkehrziel akzeptieren (Coin-Badge kann von überall öffnen); Fallback Hauptmenü
    // 'shop'/'coinshop' NIE als Rückkehrziel → sonst Schleife (Werkstatt↔Coinshop, kein Weg zurück ins Spiel)
    shopFrom=(from && from!=='shop' && from!=='coinshop' && document.getElementById(from))?from:'start';
    if(run) accrueChips();                               // Live-Chips frisch, bevor man sie ausgibt
    document.getElementById(shopFrom).classList.add('hidden'); renderShop();
    const sh=document.getElementById('shop'); sh.classList.remove('hidden'); sh.scrollTop=0; sfxUpgrade(); }
  function closeShop(){ document.getElementById('shop').classList.add('hidden');
    document.getElementById(shopFrom).classList.remove('hidden');
    if(shopFrom==='arsenalView') renderArsenalView();    // frisch freigeschaltete Forks sofort wählbar
    else updateRunShopBtns();                            // Button-Guthaben aktualisieren
    updateMenuChips(); }
  const metaById=id=>META.find(m=>m.id===id);
  let shopOpenW={};   // welche Waffen-Accordions im Werkstatt-Waffen-Tab offen sind
  // ---- Info-Tooltip (Touch: Tippen auf ⓘ zeigt lustige Beschreibung; nächster Tipp schließt) ----
  function infoBtn(title,body,extra){ return body?`<span class="infoBtn${extra?' '+extra:''}" role="button" tabindex="0" aria-label="Info" data-tt="${encodeURIComponent(title)}" data-tx="${encodeURIComponent(body)}">ⓘ</span>`:''; }
  let tipEl=null;
  function hideTip(){ if(tipEl) tipEl.classList.remove('show'); }
  function showTip(title,body,anchor){ if(!tipEl){ tipEl=document.createElement('div'); tipEl.id='tipPop'; document.body.appendChild(tipEl); }
    tipEl.innerHTML=''; const b=document.createElement('b'); b.textContent=title; tipEl.appendChild(b);
    if(body){ const p=document.createElement('p'); p.textContent=body; tipEl.appendChild(p); }
    tipEl.classList.add('show'); const vw=window.innerWidth||360, tw=Math.min(260,vw-24); tipEl.style.width=tw+'px';
    const r=anchor.getBoundingClientRect(); let left=r.left+r.width/2-tw/2; left=Math.max(12,Math.min(left,vw-tw-12)); tipEl.style.left=left+'px';
    let top=r.top-tipEl.offsetHeight-10; if(top<12) top=r.bottom+10; tipEl.style.top=top+'px'; }
  document.addEventListener('click',e=>{ const ib=e.target.closest&&e.target.closest('.infoBtn');
    if(ib){ e.stopPropagation(); showTip(decodeURIComponent(ib.dataset.tt||''),decodeURIComponent(ib.dataset.tx||''),ib); } else hideTip(); });
  document.addEventListener('keydown',e=>{ if(e.key!=='Enter'&&e.key!==' ') return; const ib=e.target&&e.target.classList&&e.target.classList.contains('infoBtn')?e.target:null;
    if(ib){ e.preventDefault(); showTip(decodeURIComponent(ib.dataset.tt||''),decodeURIComponent(ib.dataset.tx||''),ib); } });
  function metaCard(m,rr=renderShop){ const lvl=metaLvl(m.id), maxed=lvl>=m.max;
    const card=document.createElement('div'); card.className='ucard'+(maxed?' maxed':'');
    let btn;
    if(maxed) btn='<div class="cost done">MAX</div>';
    else { const cost=metaCost(m,lvl), afford=(meta.chips||0)>=cost; btn='<button class="cost'+(afford?'':' locked')+'">🪙 '+cost+'</button>'; }   // SOFORT-KAUF – kein Timer/Queue/Accelerate mehr
    card.innerHTML=infoBtn(shopName(m),FLAV(m.id),'cardInfo')+'<div class="ico">'+m.ico+'</div><h4>'+shopName(m)+'</h4><p>'+shopDesc(m)+'</p><div class="stack">'+t('level')+' '+lvl+'/'+m.max+'</div>'+btn;
    const b=card.querySelector('button.cost'); if(b) b.addEventListener('click',()=>buyMeta(m.id,rr));
    return card; }
  function shopNode(o){ // o:{ico,title,sub,state:'done'|'buy'|'locked',cost,aff,buy,tip}
    const right = o.state==='done' ? '<span class="wnode-done">✓</span>'
      : o.state==='buy' ? `<button class="cost${o.aff?'':' locked'}" data-buy="${o.buy}">🪙 ${o.cost}</button>`
      : '<span class="wnode-lock">🔒</span>';
    return `<div class="wnode ${o.state}"><span class="wni">${o.ico}</span><div class="wnt"><b>${o.title}</b>${o.sub?`<span>${o.sub}</span>`:''}</div>${infoBtn(o.title,o.tip)}${right}</div>`; }
  function weaponAccordion(w){ const id=w.id, free=(id==='blaster');
    const disc=free||weaponUnlocked(id), fu='fu_'+id, fuLvl=metaLvl(fu), FUM=4, open=!!shopOpenW[id];   // ENTDECKT (gefunden) statt gekauft
    const status=!disc?('🔒 '+t('findFirst')):('Lv '+fuLvl+'/4');
    const wrap=document.createElement('div'); wrap.className='waccord'+(open?' open':'')+(disc?'':' notowned');
    let h=`<button class="wahead" style="--wc:${w.col}"><span class="whico">${w.ico}</span><b>${wName(id)}</b>`+
      `<span class="warctag2">${wArch(id)}</span><span class="wstat">${status}</span>${infoBtn(wName(id),FLAV(id))}<span class="wcar">▾</span></button><div class="wabody">`;
    // Entdeckungs-Status statt Coin-Bauplan: erst im Spiel finden → dann mit Coins aufrüsten
    if(free) h+=shopNode({ico:'✦',title:t('startWeapon'),sub:wDesc(id),state:'done',tip:FLAV(id)});
    else h+=shopNode({ico:disc?'✓':'🔎',title:disc?t('discovered'):t('findFirst'),sub:wDesc(id),state:disc?'done':'locked',tip:FLAV(id)});
    // Aufrüst-Stufen als Baum: „<Waffe> Lv 1..4" (nur wenn entdeckt)
    for(let i=0;i<FUM;i++){ h+=`<div class="tconn2"></div>`; const paths=w.forks[i], sub=pName(paths[0])+' / '+pName(paths[1]);
      let st='locked',cost=0,aff=false,buy=null;
      if(!disc) st='locked'; else if(fuLvl>i) st='done'; else if(i===fuLvl){ st='buy'; cost=metaCost(metaById(fu),fuLvl); aff=(meta.chips||0)>=cost; buy=fu; }
      const tip=flavTier(id,i)+' '+pName(paths[0])+': '+pDesc(paths[0])+' · '+pName(paths[1])+': '+pDesc(paths[1]);
      h+=shopNode({ico:'⌥',title:wName(id)+' Lv '+(i+1),sub,state:st,cost,aff,buy,tip}); }
    h+='</div>'; wrap.innerHTML=h;
    wrap.querySelector('.wahead').addEventListener('click',e=>{ if(e.target.closest('.infoBtn')) return; shopOpenW[id]=!open; renderShop(); });
    wrap.querySelectorAll('button[data-buy]').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); buyMeta(b.dataset.buy); }));
    return wrap; }
  function renderWeaponTab(){ const gen=document.createElement('div'); gen.className='shopRow';
    ['slot','veteran'].forEach(id=>{ const m=metaById(id); if(m) gen.appendChild(metaCard(m)); });
    shopCards.appendChild(gen);
    for(const w of WEAPONS) shopCards.appendChild(weaponAccordion(w)); }
  // (Synergien/Fusionen werden ausschließlich im Arsenal-Hub-Reiter „🔗 Synergien" gekauft UND kombiniert – kein zweiter Shop-Reiter mehr.)
  const weaponBpOwned=id=>id==='blaster'||metaLvl('bp_'+id)>0;
  // „Beste nächste Upgrades": leistbare zuerst (nach Wirkung/Prio, dann günstigste), sonst nächste Ziele – direkt kaufbar
  function renderShopReco(){ const host=document.getElementById('shopReco'); if(!host) return; host.innerHTML='';
    const cand=META.filter(m=>metaLvl(m.id)<m.max&&shopCat(m.id)!=='synergy'&&m.id.indexOf('bp_')!==0).map(m=>{ const lvl=metaLvl(m.id),cost=metaCost(m,lvl); return {m,lvl,cost,aff:(meta.chips||0)>=cost}; });   // Synergien über Arsenal-Reiter; Baupläne (bp_) gibt's nur durch Finden
    if(!cand.length){ host.classList.add('hidden'); return; } host.classList.remove('hidden');
    cand.sort((a,b)=> (b.aff-a.aff) || ((b.m.prio||0)-(a.m.prio||0)) || (a.cost-b.cost));
    const pick=cand.slice(0,3);
    const lbl=document.createElement('div'); lbl.className='recoLbl'; lbl.textContent=t('recoTitle'); host.appendChild(lbl);
    const row=document.createElement('div'); row.className='recoRow';
    for(const c of pick){ const card=document.createElement('button'); card.className='recoCard'+(c.aff?'':' locked'); card.type='button';
      card.innerHTML='<span class="recoIco">'+c.m.ico+'</span><span class="recoName">'+shopName(c.m)+'</span><span class="recoMeta"><span class="recoLv">'+(c.lvl+1)+'/'+c.m.max+'</span><span class="recoCost">🪙 '+fmt(c.cost)+'</span></span>';
      if(c.aff){ card.addEventListener('click',()=>buyMeta(c.m.id)); } else { card.setAttribute('aria-disabled','true'); card.addEventListener('click',()=>{ shopTab=shopCat(c.m.id); renderShop(); }); }   // leistbar → direkt kaufen; sonst zum passenden Reiter springen (Ziel ansteuern)
      row.appendChild(card); }
    host.appendChild(row); }
  function renderShop(){ drainResearchInstant(); shopChipsEl.textContent='🪙 '+fmt(meta.chips); renderShopReco();
    clearTimeout(shopTick);   // Forschungs-Timer abgeschafft – kein Sekundentakt-Polling mehr
    if(shopHintEl) shopHintEl.textContent=t('shopHint');
    // Tab-Leiste
    const tabsEl=document.getElementById(shopTabsHostId);
    if(tabsEl){ tabsEl.innerHTML=''; tabsEl.setAttribute('role','tablist'); SHOPTABS.forEach(([key,ico])=>{ const b=document.createElement('button');
      b.className='shopTab'+(shopTab===key?' on':''); b.textContent=ico+' '+t('cat_'+key); b.setAttribute('role','tab'); b.setAttribute('aria-selected',shopTab===key);
      b.addEventListener('click',()=>{ shopTab=key; renderShop(); }); tabsEl.appendChild(b); }); }
    shopCards.innerHTML=''; shopCards.classList.toggle('treeCols',shopTab==='weapons');
    if(shopTab==='cosmetic'){ skinCards(shopCards); return; }   // Kosmetik-Tab: Skins kaufen/wählen
    if(shopTab==='weapons'){ renderWeaponTab(); return; }       // Waffen-Tab: Accordion-Skilltree pro Waffe
    META.filter(m=>shopCat(m.id)===shopTab).forEach(m=>shopCards.appendChild(metaCard(m))); }
  function buyMeta(id,rerender){ const m=META.find(x=>x.id===id); if(!m) return; const lvl=metaLvl(id);
    if(lvl>=m.max) return; const cost=metaCost(m,lvl); if(coinShort(cost)) return;
    meta.chips-=cost; meta.lvl=meta.lvl||{}; meta.lvl[id]=lvl+1; applyResearchUnlock(id); saveMeta();   // SOFORT-KAUF: kein Research-Timer/Queue mehr (weniger Reibung)
    sfxUpgrade(); vibe([15,20,15]); updateAllBalances(); (rerender||renderShop)();   // updateAllBalances → auch der Hub-Coin-Chip (#arCoin) bleibt nach dem Kauf aktuell
  }

  // ---------- Arsenal-Ansicht (In-Run, über Pause: Build ansehen, Waffe ablegen) ----------
  function openArsenalView(tab){ if(state!==S.PAUSE && state!==S.MENU && state!==S.OVER && state!==S.UPGRADE) return;
    arsenalSkillMode=false; arsenalResume=false; arsenalTab=tab||'loadout';
    // Rückkehrziel = aktuell sichtbarer Screen (der eine Hub ist von überall erreichbar: Menü/Pause/Over/Upgrade + Overlays)
    arsenalReturn=['over','upgrade','pause','settings','ach','statusView','shipEditor','start'].find(id=>{ const e=document.getElementById(id); return e && !e.classList.contains('hidden'); })
      || (state===S.OVER?'over':state===S.UPGRADE?'upgrade':state===S.PAUSE?'pause':'start');   // Fallback aus dem State, falls der Ziel-Screen-DOM (z. B. verzögerter Over-Screen) noch nicht sichtbar ist
    arsenalFromMenu=(state===S.MENU);
    if(arsenalFromMenu){ if(!mode) mode='normal'; reset(); applyMeta(); }   // im Menü: Loadout-Vorschau (mods etc.) aufbauen, ohne den Run zu starten
    else accrueChips();   // Live-Chips frisch (idempotent – auch auf Over/Upgrade unbedenklich)
    document.getElementById(arsenalReturn).classList.add('hidden');
    renderArsenalView(); const av=document.getElementById('arsenalView'); av.classList.remove('hidden'); av.scrollTop=0; sfxUpgrade(); }
  // Skill-Screen: friert das Spiel ein, zeigt den klickbaren Baum zum Ausgeben der Skillpunkte
  function openSkillScreen(){ arsenalSkillMode=true; state=S.PAUSE; accrueChips(); renderArsenalView(); const av=document.getElementById('arsenalView'); av.classList.remove('hidden'); av.scrollTop=0; sfxUpgrade(); }
  function closeArsenalView(){ document.getElementById('arsenalView').classList.add('hidden');
    if(arsenalSkillMode){ arsenalSkillMode=false; state=S.PLAY; invuln=Math.max(invuln,0.9); lastT=performance.now(); return; }   // Skill-Screen → weiterspielen
    if(arsenalResume){ arsenalResume=false; state=S.PLAY; invuln=Math.max(invuln,0.9); lastT=performance.now(); return; }   // aus dem Cockpit → weiterspielen
    const back=arsenalReturn||'start'; const e=document.getElementById(back); if(e) e.classList.remove('hidden');   // zurück zum Ursprungs-Screen (Menü/Pause/Over/Upgrade/…)
    arsenalFromMenu=false; if(back==='start') updateMenuChips(); }
  function openArsenalFromCockpit(tab){ if(state===S.PLAY){ state=S.PAUSE; arsenalResume=true; } if(state!==S.PAUSE) return;
    arsenalSkillMode=false; arsenalTab=tab||'loadout'; accrueChips(); renderArsenalView(); const av=document.getElementById('arsenalView'); av.classList.remove('hidden'); av.scrollTop=0; sfxUpgrade(); }
  // ---------- Hangar: bauen/ausrüsten mit Skillpunkten (persistent) ----------
  // 1 Skillpunkt = 1 Waffe ausrüsten ODER 1 Pfad-Knoten. Voller Rückerstatt beim Abwählen (freier Respec).
  function hangarBroke(){ beep(200,0.12,'sawtooth',0.25); vibe(20); banner={text:t('needSP'),sub:t('needSPsub'),t:1.6,color:'#ff5a7a'}; }
  // Chips als EINMAL-Senke: Waffen & Fork-Pfade kosten nur beim ALLERERSTEN Freischalten Chips (+Skillpunkt).
  // Einmal freigeschaltet → danach gratis per Skillpunkt re-/freischaltbar (Respec kostet keine Chips mehr).
  const wChipCost=()=>150+150*ownedCount();                       // nächste Waffe ausrüsten (nur 1. Mal)
  const FORKCHIP={f1:70,f2:130,f3:210,f4:300};
  const forkChipCost=slot=>FORKCHIP[slot]||130;                   // Fork-Knoten (nur 1. Mal, teurer je Stufe)
  const isUnlocked=key=> !!(meta.unlocks&&meta.unlocks[key]);     // schon je gekauft?
  const markUnlocked=key=>{ if(!meta.unlocks) meta.unlocks={}; meta.unlocks[key]=1; };
  const wKey=id=>'w:'+id, fKey=(id,path)=>'f:'+id+':'+path;
  function chipBroke(cost){ beep(200,0.12,'sawtooth',0.25); vibe(20); banner={text:t('needChips'),sub:'🪙 '+cost,t:1.6,color:'#ff5a7a'}; }
  // Zentral: zu wenig Chips → kurzes Feedback + Coin-Shop öffnen (an allen Kauf-Stellen genutzt). Rückgabe true = nicht genug.
  function coinShort(cost){ if((meta.chips||0)>=cost) return false; beep(200,0.12,'square',0.2,-60); vibe(15); openCoinShop(); return true; }
  // Coins → Skillpunkt kaufen: quadratisch steigend (50, 100, 250, 500, 850, 1300 …) = steiler als linear, nicht exponentiell
  const buySpCost=k=>50+50*(k|0)*(k|0);
  function buySkillPoint(){ const k=meta.spBought||0, cost=buySpCost(k); if(coinShort(cost)) return;
    meta.chips-=cost; meta.spBought=k+1; skillPts++; saveSP(); sfxPow(); vibe([12,18]);
    banner={text:'💠 +1 '+t('skillPts'),sub:'−🪙'+cost,t:1.4,color:'#19f0ff'}; updateAllBalances(); renderArsenalView(); }
  function dropWeapon(id){ const a=arsenal.w[id]; const refund=(id==='blaster')?0:(a&&a.spent||0);
    delete arsenal.w[id]; if(refund>0){ skillPts+=refund; saveSP(); } recalcArsenal(); beep(220,0.18,'sawtooth',0.3,-100); vibe([25,20]); updateAllBalances(); saveLoadout(); renderArsenalView(); }
  // Zuletzt gewählten Fork wieder abwählen → Skillpunkt zurück (gratis – Umskillen kostet nichts)
  function unspendOne(id,slot){ const a=arsenal.w[id]; if(!a||!a[slot]) return; const order=['f1','f2','f3','f4'], ci=order.indexOf(slot);
    if(ci<3 && a[order[ci+1]]) return;   // nur abwählbar, wenn keine höhere Stufe gewählt ist
    const before=Object.assign({},syn), p=a[slot]; a[slot]=null; a.lvl--; a.spent=Math.max(0,(a.spent||0)-1); skillPts++; saveSP(); recalcArsenal(); sfxPow(); vibe([10,16]);
    banner={text:(wName(id)+' · '+pName(p)).toUpperCase(),sub:'↺ +💠1',t:1.3,color:'#ff2e88'}; synBanner(before); updateAllBalances(); saveLoadout(); renderArsenalView(); }
  // Komplett-Respec einer Waffe: alle Forks zurück, Skillpunkte gutschreiben (gratis)
  function respecWeapon(id){ const a=arsenal.w[id]; if(!a) return; let cnt=0; for(const s of ['f1','f2','f3','f4']) if(a[s]) cnt++;
    if(!cnt) return;
    const before=Object.assign({},syn); for(const s of ['f1','f2','f3','f4']) a[s]=null; a.lvl=1; a.spent=(id==='blaster'?0:1); skillPts+=cnt; saveSP(); recalcArsenal(); sfxPow(); vibe([12,18,12]);
    banner={text:wName(id).toUpperCase(),sub:'↺ +💠'+cnt,t:1.4,color:'#ff2e88'}; synBanner(before); updateAllBalances(); saveLoadout(); renderArsenalView(); }
  function synBanner(before){ for(const s of SYNERGIES){ if(syn[s.id]&&!before[s.id]){
    banner={text:s.ico+' '+synName(s.id)+' · '+t('synUnlocked'),sub:synDesc(s.id),t:2.8,color:'#ff2e88'};
    if(player) floatText(player.x,player.y-44,s.ico,'#ff2e88',32); flash=Math.min(0.7,(flash||0)+0.3); flashColor='#ff2e88'; } } }
  // Hangar: das gebaute Loadout bleibt erhalten (kein Neu-Aufbau jedes Mal)
  function saveLoadout(){ try{ meta.loadout={w:JSON.parse(JSON.stringify(arsenal.w||{})), syn:(activeSyn||[]).slice(), oc:mods.oc||0}; saveMeta(); }catch(e){} }
  // Start-Loadout (persistente Favoriten-Waffen, überleben den Tod): aktuell ausgerüstete Nicht-Blaster-Waffen
  function curKit(){ return ownedW().filter(id=>id!=='blaster'); }
  function kitSaved(){ const c=curKit(), s=meta.startKit||[]; if(!c.length||c.length!==s.length) return false; const ss=new Set(s); return c.every(x=>ss.has(x)); }
  function afterSpend(){ saveLoadout(); if(arsenalSkillMode && !hasSkillSpend()) closeArsenalView(); else renderArsenalView(); }
  function spendFork(id,slot,path){ const a=arsenal.w[id]; if(!a||nodeState(id,a,slot,path)!=='avail') return; if(skillPts<=0){ hangarBroke(); return; }
    const key=fKey(id,path), firstTime=!isUnlocked(key), cc=firstTime?forkChipCost(slot):0;   // Chips nur beim ersten Mal
    if(firstTime && (meta.chips||0)<cc){ chipBroke(cc); return; } const before=Object.assign({},syn);
    if(firstTime){ meta.chips-=cc; markUnlocked(key); } skillPts--; saveSP(); saveMeta(); a.spent=(a.spent||0)+1; a[slot]=path; a.lvl++; recalcArsenal(); sfxPow(); vibe(15);
    banner={text:(wName(id)+' · '+pName(path)).toUpperCase(),sub:t('activated'),t:1.4,color:'#19f0ff'}; synBanner(before); updateAllBalances(); afterSpend(); lore('fork'); }
  function addWeaponSkill(id){ if(!opt.guns||arsenal.w[id]||ownedCount()>=arsenal.slots||!weaponUnlocked(id)) return; if(skillPts<=0){ hangarBroke(); return; }
    const before=Object.assign({},syn);   // entdeckte Waffe bauen = nur 1 Skillpunkt, KEINE Coins mehr (Coins fließen ins Aufrüsten)
    skillPts--; saveSP(); saveMeta(); arsenal.w[id]={lvl:1,f1:null,f2:null,f3:null,f4:null,spent:1}; recalcArsenal(); sfxPow(); vibe(15);
    banner={text:wName(id).toUpperCase(),sub:t('newWeapon'),t:1.4,color:'#19f0ff'}; synBanner(before); updateAllBalances(); afterSpend(); lore('weapon'); }
  // (Synergien sind automatisch aktiv – kein manuelles Toggle/Slot-Management mehr)
  // Zustand eines Pfad-Knotens: chosen (gewählt) / avail (als nächstes wählbar) / dim (Geschwister verworfen) / locked (noch nicht erreichbar)
  function nodeState(id,a,slot,path){ const sel=a[slot];
    if(sel===path) return 'chosen';
    if(sel) return 'dim';                       // in diesem Fork wurde schon der andere Pfad gewählt
    const open={f1:true, f2:!!a.f1, f3:!!a.f2, f4:!!a.f3};   // Gabelung erst frei, wenn die vorige gewählt ist
    if(!open[slot]) return 'locked';
    return 'avail'; }
  function treeNode(id,slot,path){ const a=arsenal.w[id], st=nodeState(id,a,slot,path), can=(st==='avail'&&opt.guns);
    const next={f1:'f2',f2:'f3',f3:'f4'}[slot], undoable=(st==='chosen'&&opt.guns&&!(next&&a[next]));   // zuletzt gewählte Stufe → abwählbar (Reskill)
    const firstTime=!isUnlocked(fKey(id,path)), cc=firstTime?forkChipCost(slot):0, aff=can&&skillPts>0&&(!firstTime||(meta.chips||0)>=cc);
    const hint=can?('<span class="pickhint'+(aff?'':' shop')+'">💠1'+(firstTime?(' 🪙'+cc):'')+'</span>'):'';
    const ti={f1:0,f2:1,f3:2,f4:3}[slot]||0, tip=pDesc(path)+' · '+(flavPath(path)||flavTier(id,ti));   // echte Pfad-Beschreibung + Subskill-eigener Spruch
    return `<div class="tnode ${st}${can?' pick':''}${undoable?' undoable':''}" data-wid="${id}" data-slot="${slot}" data-path="${path}" title="${pDesc(path)}">${infoBtn(pName(path),tip,'tnInfo')}<span class="ti">${PATHICO[path]||'•'}</span><span class="tn">${pName(path)}</span>${hint}</div>`; }
  // Eine Fork-Reihe: die zwei wählbaren Knoten (Skillpunkt).
  function treeRow(id,slot,paths){ return `<div class="trow">${treeNode(id,slot,paths[0])}${treeNode(id,slot,paths[1])}</div>`; }
  // Fusion an-/abwählen (freie Slot-Wahl ersetzt das alte Auto-Aktivieren)
  function toggleSyn(id){ if(!synBought(id)) return;
    if(mode==='zen'){ if(!Array.isArray(zenSynSel)) zenSynSel=[];   // Zen: nur die transiente Auswahl anfassen
      if(zenSynSel.includes(id)){ zenSynSel=zenSynSel.filter(x=>x!==id); beep(330,0.06,'square',0.18); }
      else { if(activeSyn.length>=synSlots()){ beep(150,0.1,'square',0.2); return; } zenSynSel.push(id); sfxUpgrade(); }
      recalcArsenal(); renderArsenalView(); return; }
    if(!Array.isArray(meta.synSel)) meta.synSel=[]; if(!meta.synOff) meta.synOff={};
    if(meta.synSel.includes(id)){ meta.synSel=meta.synSel.filter(x=>x!==id); meta.synOff[id]=1; beep(330,0.06,'square',0.18); }
    else { if(activeSyn.length>=synSlots()){ beep(150,0.1,'square',0.2); return; } meta.synSel.push(id); delete meta.synOff[id]; sfxUpgrade(); lore('synergy'); }
    saveMeta(); recalcArsenal(); renderArsenalView(); }
  function renderArsenalView(){
    if(arsenalSkillMode) arsenalTab='loadout';   // Skill-Screen erzwingt Loadout
    const synReady=ownedCount()>=2;   // Synergien erst zeigen, wenn ≥2 Waffen (vorher nicht nutzbar → Neulinge nicht verwirren)
    if(arsenalTab==='syn' && !synReady) arsenalTab='loadout';
    // EIN Hub: Loadout · Synergien · Werkstatt (Upgrades + Skins) — kein getrennter zweiter Kauf-Screen mehr
    const arTabs=document.getElementById('arTabs');
    if(arTabs){ const tabs=[['loadout','🎒 '+t('arsenalTab')]]; if(synReady) tabs.push(['syn','🔗 '+t('synTitle')]); tabs.push(['shop','⬆️ '+t('tabUpgrades')]);
      arTabs.innerHTML=''; arTabs.setAttribute('role','tablist'); tabs.forEach(([k,lbl])=>{ const b=document.createElement('button'); b.className='shopTab'+(arsenalTab===k?' on':''); b.textContent=lbl;
        b.setAttribute('role','tab'); b.setAttribute('aria-selected',arsenalTab===k);
        b.addEventListener('click',()=>{ arsenalTab=k; renderArsenalView(); }); arTabs.appendChild(b); }); }
    const show=(id,on)=>{ const e=document.getElementById(id); if(e) e.classList.toggle('hidden',!on); };
    show('arSecLoadout',arsenalTab==='loadout'); show('arSecSyn',arsenalTab==='syn'); show('arSecShop',arsenalTab==='shop');
    { const ac=document.getElementById('arCoin'); if(ac) ac.textContent='🪙 '+fmt(meta.chips||0); }   // EINE klickbare Coin-Anzeige im Hub-Header (gleiche Stelle auf allen Tabs)
    if(arsenalTab==='shop'){ setShopHost('arsenal'); renderShop(); const bb0=document.getElementById('arsenalBackBtn'); if(bb0) bb0.textContent=t('back'); return; }
    updateRunShopBtns(); const sub=document.getElementById('arsenalViewSub');
    if(sub){ sub.innerHTML='<span class="rp" title="'+t('slotsLbl')+'">🎒 '+ownedCount()+'/'+arsenal.slots+'</span>'
      +'<span class="rp" title="'+t('skillPts')+'">💠 '+skillPts+'</span>'; }   // Coins stehen jetzt zentral im Header-Chip (#arCoin) – nicht mehr doppelt hier
    const bsp=document.getElementById('arBuySpBtn');
    if(bsp){ bsp.classList.add('hidden'); }   // Anti-P2W: Skillpunkte sind NICHT mehr mit Münzen kaufbar (nur erspielt: Bosse/Drops)
    const skb=document.getElementById('arStartKitBtn');
    if(skb){ const cur=curKit(); if(!opt.guns||!cur.length){ skb.classList.add('hidden'); }
      else { skb.classList.remove('hidden'); const on=kitSaved(); skb.classList.toggle('on',on);
        skb.innerHTML=on?('★ '+t('kitActive')):('☆ '+t('kitSave'));
        skb.title=t('kitHint');
        skb.onclick=()=>{ if(kitSaved()){ meta.startKit=null; beep(330,0.06,'square',0.18); } else { meta.startKit=curKit(); sfxUpgrade(); } saveMeta(); renderArsenalView(); }; } }
    const bb=document.getElementById('arsenalBackBtn'); if(bb) bb.textContent=arsenalSkillMode?t('skillNext'):t('back');
    const wrap=document.getElementById('arsenalCards'); if(!wrap) return; wrap.innerHTML='';
    ownedW().forEach(id=>{ const a=arsenal.w[id], w=WID[id], f1=w.forks[0], f2=w.forks[1], f3=w.forks[2], f4=w.forks[3];
      const card=document.createElement('div'); card.className='wtree';
      card.innerHTML=
        infoBtn(wName(id),FLAV(id),'cardInfo')+
        `<div class="wtree-head" style="--wc:${w.col}"><span class="whico">${w.ico}</span><div class="whmain"><b>${wName(id)}</b><span class="wlv">Lv ${a.lvl}/5</span></div>${a.lvl>1?`<button class="cost respec" title="${t('respec')}">↺</button>`:''}<button class="cost drop">✕</button></div>`+
        `<div class="warctag" style="--wc:${w.col}">${wArch(id)}</div>`+
        `<div class="wmech">${wDesc(id)}</div>`+
        `<div class="tnode base chosen"><span class="ti">${w.ico}</span><span class="tn">L1</span></div>`+
        `<div class="tconn"></div>`+treeRow(id,'f1',f1)+
        `<div class="tconn"></div>`+treeRow(id,'f2',f2)+
        `<div class="tconn"></div>`+treeRow(id,'f3',f3)+
        `<div class="tconn"></div>`+treeRow(id,'f4',f4);
      { const db=card.querySelector('button.drop'); if(db) db.addEventListener('click',e=>{ e.stopPropagation();
        if(db._armed){ dropWeapon(id); return; }                                  // 2. Tipp = bestätigen → verhindert versehentliches Ablegen
        db._armed=true; const o=db.textContent; db.textContent='✓?'; db.classList.add('armed'); try{ beep(330,0.05,'square',0.18); }catch(_){ }
        clearTimeout(db._t); db._t=setTimeout(()=>{ if(db){ db._armed=false; db.textContent=o; db.classList.remove('armed'); } },2200); }); }
      const rb=card.querySelector('button.respec'); if(rb) rb.addEventListener('click',e=>{ e.stopPropagation(); respecWeapon(id); });
      card.querySelectorAll('.tnode.pick').forEach(n=>n.addEventListener('click',e=>{ if(e.target.closest('.infoBtn')) return; spendFork(n.dataset.wid,n.dataset.slot,n.dataset.path); }));
      card.querySelectorAll('.tnode.undoable').forEach(n=>n.addEventListener('click',e=>{ if(e.target.closest('.infoBtn')) return; unspendOne(n.dataset.wid,n.dataset.slot); }));
      wrap.appendChild(card); });
    const free=arsenal.slots-ownedCount();
    const addable=WEAPONS.filter(w=>!arsenal.w[w.id]&&weaponUnlocked(w.id));      // nur ENTDECKTE Waffen baubar (per Skillpunkt, gratis)
    const undisc=WEAPONS.filter(w=>!arsenal.w[w.id]&&!weaponUnlocked(w.id));      // noch nicht entdeckt → im Spiel finden
    if(opt.guns&&free>0&&addable.length){ addable.forEach(w=>{ const aff=skillPts>0; const card=document.createElement('div'); card.className='wtree addable';
        card.innerHTML=infoBtn(wName(w.id),FLAV(w.id),'cardInfo')+`<div class="wtree-head" style="--wc:${w.col}"><span class="whico">${w.ico}</span><div class="whmain"><b>${wName(w.id)}</b></div></div>`+
          `<div class="warctag" style="--wc:${w.col}">${wArch(w.id)}</div>`+
          `<div class="tnode base avail"><span class="ti">${w.ico}</span><span class="tn">L1</span></div>`+
          `<p class="adddesc">${wDesc(w.id)}</p>`+
          `<button class="cost addw${aff?'':' locked'}">➕ ${t('addWeapon')} · 💠1</button>`;
        card.querySelector('.addw').addEventListener('click',()=>addWeaponSkill(w.id)); wrap.appendChild(card); }); }
    else if(opt.guns&&free>0){ for(let i=ownedCount()+(undisc.length?0:0);i<arsenal.slots;i++){ const card=document.createElement('div'); card.className='wtree slotEmpty'; card.innerHTML=`<div class="ico">＋</div><p>${t('freeSlot')}</p>`; wrap.appendChild(card); } }
    if(opt.guns&&undisc.length){ undisc.forEach(w=>{ const card=document.createElement('div'); card.className='wtree addable locked';   // unentdeckt: Hinweis „im Spiel finden"
        card.innerHTML=infoBtn(wName(w.id),FLAV(w.id),'cardInfo')+`<div class="wtree-head" style="--wc:${w.col};opacity:.6"><span class="whico">🔒</span><div class="whmain"><b>${wName(w.id)}</b></div></div>`+
          `<div class="warctag" style="--wc:${w.col}">${wArch(w.id)}</div>`+
          `<div class="tnode base"><span class="ti">${w.ico}</span><span class="tn">🔒</span></div>`+
          `<p class="adddesc">🔎 ${t('findFirst')}</p>`; wrap.appendChild(card); }); }
    const sd=document.getElementById('arsenalSyn'); if(sd){
      // FUSIONEN 2.0: hier kaufen → bis Slot-Limit frei kombinieren → Kills laden die ÜBERLADUNG (Cockpit). EINZIGER Synergie-Ort.
      const slots=synSlots();
      const rows=SYNERGIES.map(s=>{ const a=s.pair[0],b=s.pair[1],hasA=!!arsenal.w[a],hasB=!!arsenal.w[b],both=hasA&&hasB;
        const bought=synBought(s.id), on=syn[s.id]; let cls,right,tap='';
        if(on){ cls='on syntap'; right='<span class="synok">✓ '+t('synOn')+' · '+t('drop')+'</span>'; tap='1'; }
        else if(bought&&both){ const free=activeSyn.length<slots; cls=(free?'avail':'near')+(free?' syntap':''); right='<span class="synok">'+(free?('＋ '+t('synPick')):('🧬 '+t('synFull')))+'</span>'; if(free) tap='1'; }
        else if(!bought&&both){ const mm=metaById('sy_'+s.id), cost=metaCost(mm,0), aff=(meta.chips||0)>=cost; cls='buyable';
          right='<button class="cost synbuy'+(aff?'':' locked')+'" data-buy="sy_'+s.id+'">🪙 '+cost+'</button>'; }
        else { cls='off'; right='<span class="synneed">'+(bought?'':'🔒 ')+t('synNeed')+' '+(hasA?WID[b].ico:(hasB?WID[a].ico:WID[a].ico+WID[b].ico))+'</span>'; }
        const rank=on?3:(bought&&both?2.5:(both?2:((hasA||hasB)?1:0)));
        return {rank,html:`<div class="synrow ${cls}" data-syn="${s.id}"${tap?' data-tap="1"':''}><div class="synhead"><span class="synpair">${WID[a].ico}+${WID[b].ico}</span> <b>${synName(s.id)}</b> ${right}${infoBtn(synName(s.id),FLAV(s.id)+' — '+synDesc(s.id))}</div><div class="synd">${synDesc(s.id)}</div></div>`}; });
      rows.sort((x,y)=>y.rank-x.rank);   // aktiv → wählbar → kaufbar → fehlt
      sd.innerHTML='<h4>'+t('synTitle')+' <span class="synslots">🧬 '+activeSyn.length+'/'+slots+'</span></h4><p class="synhint">'+t('synHint')+'</p><div id="arSynSlot"></div>'+rows.map(r=>r.html).join('');
      const sm=metaById('synslot'), slotHost=document.getElementById('arSynSlot');   // Slot-Ausbau (+1 aktive Fusion) jetzt direkt hier statt im entfernten Shop-Reiter
      if(sm&&slotHost) slotHost.appendChild(metaCard(sm,renderArsenalView));
      sd.querySelectorAll('.synrow[data-tap]').forEach(r=>r.addEventListener('click',e=>{ if(e.target.closest('.infoBtn')||e.target.closest('button')) return; toggleSyn(r.dataset.syn); }));
      sd.querySelectorAll('button[data-buy]').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); buyMeta(b.dataset.buy,renderArsenalView); })); }
  }
  // In-Run HUD: Waffenleiste mit Level-Pips + Synergie-Badges
  function drawArsenalHud(){ const ids=ownedW();
    const y=H-24; let x=14; ctx.textAlign='left'; ctx.textBaseline='middle';
    for(const id of ids){ ctx.font='17px Space Mono, monospace'; ctx.shadowBlur=8; ctx.shadowColor=WID[id].col; ctx.fillStyle='#fff'; ctx.fillText(WID[id].ico,x,y);
      ctx.shadowBlur=0; const lv=arsenal.w[id].lvl; for(let i=0;i<5;i++){ ctx.fillStyle=i<lv?WID[id].col:'rgba(255,255,255,0.16)'; ctx.fillRect(x+1+i*5,y+12,3,3); }
      x+=34; }
    const act=SYNERGIES.filter(s=>syn[s.id]); if(act.length){ x+=4; ctx.font='14px Space Mono, monospace'; for(const s of act){ ctx.shadowBlur=9; ctx.shadowColor='#ff2e88'; ctx.fillStyle='#ff7ab8'; ctx.fillText(s.ico,x,y-1); x+=20; } }
    if(skillPts>0&&opt.guns){ x+=6; ctx.font='700 13px Orbitron, sans-serif'; ctx.shadowBlur=10+(Math.sin((elapsed||0)*5)+1)*4; ctx.shadowColor='#19f0ff'; ctx.fillStyle='#19f0ff'; ctx.fillText('💠'+skillPts,x,y-1); }
    ctx.shadowBlur=0; }
  // ---------- Cockpit-HUD (DOM, unten): Leben/Schild/Waffen/Synergien ----------
  const SHIELD_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L21 6 V12 C21 17 17 21 12 22 C7 21 3 17 3 12 V6 Z" fill="#2effc0"/></svg>';
  const cockpitEl=()=>document.getElementById('cockpit');
  function showCockpit(on){ const ck=cockpitEl(); if(ck){ ck.classList.toggle('hidden',!on); if(on){ ck._sig=''; placeCockpit(); } } }
  function renderCockpit(){ const ck=cockpitEl(); if(!ck||ck.classList.contains('hidden')) return;
    const sp=(opt.guns&&skillPts>0)?skillPts:0, synU=SYNERGIES.filter(s=>synUnlocked(s.id)).length;
    const wsig=WEAPONS.map(w=>{ const a=arsenal.w[w.id]; return w.id+(a?('E'+a.lvl):(weaponUnlocked(w.id)?'U':'L')); }).join(',');
    const csig=activeSyn.map(id=>Math.round((synCharge[id]||0)*24)).join('.');
    const sig=mode+'|'+lives+'|'+shields+'|'+wsig+'|'+activeSyn.join(',')+'|'+csig+'|'+synU+'|'+sp+'|'+opt.guns;
    if(ck._sig===sig) return; ck._sig=sig;
    let h='<div class="ckFrame"><div class="ckDeco" aria-hidden="true"><span class="ckScan"></span><span class="ckGrid"></span><span class="ckRivets"></span></div><div class="ckBody">';
    // OBERE Reihe: Waffen + Synergien + Steuerung (darf umbrechen, wächst nach oben)
    h+='<div class="ckRow ckRowTop">';
    if(opt.guns){ h+='<div class="ckBay ckWeaponBay" aria-label="Waffen-Slots"><span class="ckLbl">'+t('ckLblW')+'</span>';
      for(const w of WEAPONS){ const a=arsenal.w[w.id], unl=weaponUnlocked(w.id), st=a?'eq':(unl?'av':'lk');
        if(st==='lk') continue;   // gesperrte Waffen nicht im Cockpit zeigen (leben in der Werkstatt 🎒) – HUD bleibt aufgeräumt
        h+='<button class="ckSlot '+st+'" style="--wc:'+w.col+'" data-tab="loadout" aria-label="'+wName(w.id)+' – '+(a?('Stufe '+a.lvl):(unl?'verfügbar, baubar':'gesperrt, in der Werkstatt freischalten'))+'">';
        h+='<span class="cki">'+w.ico+'</span>';
        if(a){ h+='<span class="ckpips">'; for(let i=0;i<5;i++) h+='<i class="'+(i<a.lvl?'on':'')+'"></i>'; h+='</span>'; }
        else h+='<span class="ckslotTag">'+(unl?'＋':'🔒')+'</span>';
        h+='</button>'; }
      h+='</div>'; }
    if(opt.guns&&ownedCount()>=2){ h+='<div class="ckBay ckSynBay" aria-label="Aktive Synergien '+activeSyn.length+'"><span class="ckLbl">'+t('ckLblS')+'</span>';   // Synergie-Bay erst ab 2 Waffen; zeigt automatisch aktive Fusionen
      if(activeSyn.length){ for(const id of activeSyn){ const s=SID[id], c=Math.min(1,synCharge[id]||0), rdy=c>=1;
        h+='<button class="ckSyS on'+(rdy?' rdy':'')+'" data-ult="'+id+'" data-tab="syn" style="--p:'+Math.round(c*100)+'%" aria-label="'+synName(id)+(rdy?' – '+t('ultReady'):'')+'">'+s.ico+'</button>'; } }
      else h+='<button class="ckSyS" data-tab="syn" aria-label="Noch keine Synergie – passende Waffen kombinieren">–</button>';
      h+='</div>'; }
    if(sp||opt.guns){ h+='<div class="ckBay ckCtl">';
      if(sp) h+='<button class="ckSkill" data-tab="loadout" aria-label="Skillpunkte '+sp+' – Skill-Baum öffnen">💠'+sp+'</button>';
      if(opt.guns) h+='<button class="ckHub" data-tab="loadout" aria-label="Arsenal öffnen">🎒</button>'; h+='</div>'; }
    h+='</div>';
    // UNTERE Reihe (FIX, eine Zeile): Status-Konsole + Leben/Schild – springt nie
    h+='<div class="ckRow ckRowBot"><div class="ckBay ckStatusBay"><span class="ckRadar" aria-hidden="true"><b></b></span><span class="ckLeds" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>';
    h+='<div class="ckBay ckVitalsBay"><span class="ckLbl">'+t('ckLblV')+'</span><span class="ckVitals">';
    if(mode!=='zen'){ h+='<span class="ckLives" aria-label="Leben '+Math.max(0,lives)+'">'; for(let i=0;i<Math.max(0,lives);i++) h+='♥'; if(lives<=0) h+='<i class="empty">♥</i>'; h+='</span>'; }
    else h+='<span class="ckLives" style="color:#ffe600" aria-label="Zen: unendlich">∞</span>';
    if(shields>0){ h+='<span class="ckShields" aria-label="Schilde '+shields+'">'; for(let i=0;i<shields;i++) h+=SHIELD_SVG; h+='</span>'; }
    h+='</span></div></div>';
    h+='</div></div>';
    ck.innerHTML=h; }
  // ---------- Einstellungen ----------
  let settingsReturn='start';
  function openSettings(){ settingsReturn=(!document.getElementById('pause').classList.contains('hidden'))?'pause':'start';   // aus Pause erreichbar → dorthin zurück
    document.getElementById(settingsReturn).classList.add('hidden'); renderSettings();
    document.getElementById('settings').classList.remove('hidden'); beep(660,0.06,'square',0.2); }
  function closeSettings(){ document.getElementById('settings').classList.add('hidden');
    document.getElementById(settingsReturn||'start').classList.remove('hidden'); }
  // ---------- Coin-Shop + Dev-/Tester-Codes ----------
  // Pixel-Art-Schatztruhe (Symbol für den Coin-Shop)
  const CHEST_SVG='<svg class="chestIco" viewBox="0 0 24 24" aria-hidden="true">'
    +'<rect x="3.5" y="11" width="17" height="9" rx="1.2" fill="#b5651d"/>'
    +'<path d="M3.5 11 V9.5 Q3.5 6.3 12 6.3 Q20.5 6.3 20.5 9.5 V11 Z" fill="#d2812a"/>'
    +'<rect x="3.5" y="11" width="17" height="1.3" fill="#ffe27a"/>'
    +'<rect x="3.5" y="14.3" width="17" height="2" fill="#ffd24a"/>'
    +'<rect x="10.4" y="10.1" width="3.2" height="5.2" rx="0.5" fill="#ffd24a"/>'
    +'<rect x="11.45" y="11.9" width="1.1" height="1.9" rx="0.4" fill="#6e3410"/></svg>';
  const DEVCODES={dev1000:1000,dev5000:5000,dev10000:10000};
  const COINQUIPS={
    de:['Geld stinkt nicht, aber Neon leuchtet.','Kapitalismus – jetzt in Pink.','Spar dir das Sparen, gib es aus!','Reich wird man im Schlaf. Oder hier.','Mehr Coins = mehr Bumms. Wissenschaft.','Dein Sparschwein hat schon Angst.','Investiere in Pixel. Krisensicher.','Echtgeld? Bald. Erstmal Dev-Codes.'],
    en:['Money doesn’t stink, but neon glows.','Capitalism – now in pink.','Don’t save it, spend it!','Get rich in your sleep. Or here.','More coins = more boom. Science.','Your piggy bank is scared.','Invest in pixels. Crisis-proof.','Real money? Soon. Dev codes first.'],
    fr:['L’argent n’a pas d’odeur, le néon brille.','Le capitalisme – mais en rose.','N’économise pas, dépense !','Deviens riche en dormant. Ou ici.','Plus de coins = plus de boum. Science.','Ta tirelire a déjà peur.','Investis dans les pixels. Anticrise.','De l’argent réel ? Bientôt. D’abord les codes.']
  };
  let coinReturn='start';
  function updateAllBalances(){ const bal='🪙 '+fmt(meta.chips||0); ['shopChips','arShopChips','coinBal','arCoin'].forEach(id=>{ const e=document.getElementById(id); if(e) e.textContent=bal; }); if(typeof updateMenuChips==='function') updateMenuChips(); }
  // ---------- In-App-Käufe: Google Play Billing in der TWA via Digital Goods API ----------
  // Funktioniert NUR in der installierten Play-App (mit aktiviertem Play Billing). Im Browser/iOS
  // ist getDigitalGoodsService nicht vorhanden → Shop bleibt auf „bald verfügbar".
  const PLAY_BILLING='https://play.google.com/billing';
  const COIN_PACKS=[1000,5000,12000];   // Coin-Mengen je Pack (Buttons via data-coins)
  const coinsFromId=(id)=>{ const m=String(id||'').match(/(\d+)/); return m?parseInt(m[1],10):0; };
  const BUYFAIL={de:'Kauf fehlgeschlagen',en:'Purchase failed',fr:'Achat échoué'};
  let dgService=null, billingReady=false, lastDetErr='', lastBillingDbg='';
  // Voller Fehlertext: name UND message (die DOMException der Digital-Goods-API trägt die echte
  // native Ursache – z. B. ITEM_NOT_OWNED/SERVICE_DISCONNECTED/DEVELOPER_ERROR – oft nur in message).
  function errInfo(e){ if(!e) return '?'; const n=e.name||''; const m=e.message||''; const c=(e.code!=null&&e.code!==0)?(' #'+e.code):'';
    if(n&&m&&n!==m) return n+': '+m+c; return (n||m||String(e))+c; }
  function fmtPrice(p){ if(!p||p.value==null) return ''; const num=parseFloat(p.value); const v=isNaN(num)?String(p.value):num.toFixed(2);
    return p.currency==='EUR'?(v.replace('.',',')+' €'):(v+' '+(p.currency||'')); }   // „7,99 €" statt „7,990000 €"
  async function initBilling(){ if(billingReady) return true;
    if(typeof window.getDigitalGoodsService!=='function') return false;
    try{ dgService=await window.getDigitalGoodsService(PLAY_BILLING); }catch(e){ dgService=null; }
    if(!dgService) return false; billingReady=true;
    // Beim Verbinden alle noch „besessenen" (nicht konsumierten) Käufe aufräumen → wieder kaufbar.
    // (Coins wurden beim Kauf bereits gutgeschrieben; hier NICHT erneut gutschreiben → kein Doppel.)
    await consumeOwned();
    await retryPendingConsumes();   // gemerkte hängende Tokens erneut konsumieren
    return true; }
  // getDetails für EINE Produkt-ID mit Retry: OperationError tritt oft auf, solange die Billing-
  // Verbindung noch nicht fertig steht → bis zu 3 Versuche mit kurzer Pause.
  async function detailsFor(id){ for(let i=0;i<3;i++){
      try{ return (await dgService.getDetails([id]))||[]; }
      catch(e){ lastDetErr=(e&&(e.name||e.message))||'Fehler'; if(i<2) await new Promise(r=>setTimeout(r,350+i*450)); } }
    return []; }
  // Alle „besessenen" Käufe konsumieren → Verbrauchsartikel (Coins) werden dadurch wieder kaufbar.
  // listPurchases mit Retry (wirft – wie getDetails – OperationError, solange die Billing-Verbindung
  // noch nicht steht); Token daraus; consume ODER acknowledge (je nach Digital-Goods-Version).
  async function listPurchasesRetry(){ for(let i=0;i<4;i++){
      try{ return (await dgService.listPurchases())||[]; }
      catch(e){ lastBillingDbg='listPurchases'+(i+1)+':'+errInfo(e); if(i<3) await new Promise(r=>setTimeout(r,400+i*500)); } }
    return null; }
  async function consumeOwned(){ try{ if(!dgService||typeof dgService.listPurchases!=='function'){ lastBillingDbg='kein listPurchases'; return; }
      const ps=await listPurchasesRetry();
      if(ps==null){ lastBillingDbg='listPurchases scheitert (Retry erschöpft)'; return; }
      let done=0, err='';
      for(const p of ps){ const tok=p&&(p.purchaseToken||p.token); if(!tok){ err=err||'kein Token'; continue; }
        try{ if(typeof dgService.consume==='function'){ await dgService.consume(tok); done++; } else if(typeof dgService.acknowledge==='function'){ await dgService.acknowledge(tok,true); done++; } else err='kein consume/ack'; }catch(e){ err=errInfo(e); } }
      lastBillingDbg='besessen:'+ps.length+' | konsumiert:'+done+(err?(' | '+err):''); }catch(e){ lastBillingDbg='consumeOwned-Fehler:'+errInfo(e); } }
  // consume EINES Tokens mit Wiederholung: direkt nach dem Kauf kann der Digital-Goods-BillingClient
  // (eigene Verbindung, getrennt vom Kauf-Flow) den Kauf noch nicht „sehen" (ITEM_NOT_OWNED) oder kurz
  // getrennt sein (SERVICE_DISCONNECTED) → mehrere Versuche mit wachsender Pause. '' = Erfolg.
  async function consumeToken(tok){ if(!tok) return 'kein Token';
    const fn = (dgService&&typeof dgService.consume==='function') ? (t)=>dgService.consume(t)
             : (dgService&&typeof dgService.acknowledge==='function') ? (t)=>dgService.acknowledge(t,true) : null;
    if(!fn) return 'keine consume/ack-API';
    let last=''; for(let i=0;i<5;i++){ try{ await fn(tok); return ''; }
      catch(e){ last=errInfo(e); if(i<4) await new Promise(r=>setTimeout(r,600+i*900)); } }
    return last||'Fehler'; }
  // Offene (noch nicht konsumierte) Tokens persistent merken → bei jedem Shop-Öffnen erneut versuchen,
  // damit ein hängender Kauf sich selbst aufräumt, sobald consume wieder klappt.
  function addPendingToken(tok){ if(!tok) return; meta.pendTok=meta.pendTok||[]; if(meta.pendTok.indexOf(tok)<0){ meta.pendTok.push(tok); saveMeta(); } }
  async function retryPendingConsumes(){ if(!dgService||!meta.pendTok||!meta.pendTok.length) return;
    for(const tok of meta.pendTok.slice()){ const err=await consumeToken(tok);
      if(!err){ const i=meta.pendTok.indexOf(tok); if(i>=0) meta.pendTok.splice(i,1); saveMeta(); } } }
  // Sichtbare Billing-Selbstdiagnose (ohne PC/USB): zeigt, ob getDetails bzw. listPurchases nativ
  // funktionieren – grenzt ein, ob die GESAMTE Digital-Goods-Verbindung tot ist oder nur das Konsumieren.
  async function billingSelfTest(){ const msg=document.getElementById('coinMsg'); if(!msg||!dgService) return;
    msg.textContent='🔧 Diagnose läuft…'; msg.className='devMsg';
    let det='?'; try{ const r=await dgService.getDetails(['coins_1000']); det=(r&&r.length)?('ok'+(r[0]&&r[0].price?(' '+fmtPrice(r[0].price)):'')):'leer'; }catch(e){ det='FEHLER:'+errInfo(e); }
    let lp='?'; try{ const r=await dgService.listPurchases(); lp='ok('+((r&&r.length)||0)+')'; }catch(e){ lp='FEHLER:'+errInfo(e); }
    const pend=(meta.pendTok&&meta.pendTok.length)||0;
    // Host-Browser + Versionen: clientAppUnavailable kommt fast immer von einem veralteten/Nicht-Chrome-
    // Host oder einem WebView-Fallback (kein Digital-Goods-Support). UA macht das ohne PC sichtbar.
    const ua=navigator.userAgent||''; const cr=(ua.match(/Chrome\/(\d+)/)||[])[1]||'?';
    const av=(ua.match(/Android[ /](\d+)/)||[])[1]||'?'; const wv=/; wv\)/.test(ua)||/\bwv\b/.test(ua);
    const sams=/SamsungBrowser\/([\d.]+)/.exec(ua); const host=wv?'WebView!':(sams?('Samsung '+sams[1]):('Chrome '+cr));
    // Host/Android ZUERST (kritischste Info) – sonst rechts abgeschnitten. Fehlertexte kurz.
    msg.textContent='🔧 '+host+' / Android '+av+' · Det:'+det+' · Lst:'+lp+(pend?(' · offen:'+pend):''); msg.className='devMsg'; }
  async function buyCoins(sku){ if(!billingReady||!window.PaymentRequest||!coinsFromId(sku)) return;
    const msg=document.getElementById('coinMsg');
    try{
      const pr=new PaymentRequest([{supportedMethods:PLAY_BILLING,data:{sku}}],
        {total:{label:'THRONERUSH',amount:{currency:'EUR',value:'0'}}});   // Betrag wird von Play durch den SKU-Preis ersetzt
      const resp=await pr.show();
      const tok=resp&&resp.details&&(resp.details.purchaseToken||resp.details.token);   // Token DIREKT aus der Kauf-Antwort (kein listPurchases nötig)
      await resp.complete('success');
      meta.chips=(meta.chips||0)+coinsFromId(sku); saveMeta(); updateAllBalances();   // Coins sofort gutschreiben (SKU ist bekannt)
      if(tok){ const err=await consumeToken(tok); if(err) addPendingToken(tok); }   // Token mit Wiederholung/Backoff konsumieren; Fehler → hängenden Token merken (später erneut versuchen)
      if(msg){ msg.textContent='✓ +'+fmt(coinsFromId(sku))+' '+t('coins')+'!'; msg.className='devMsg ok'; } sfxPow(); vibe([20,20,40]);
      consumeOwned();   // zusätzlich best-effort (falls listPurchases doch verfügbar ist)
    }catch(e){ if(e&&(e.name==='AbortError'||e.name==='NotAllowedError')) return;   // Nutzer hat abgebrochen → still
      if(msg){ msg.textContent='✗ '+(BUYFAIL[lang]||BUYFAIL.de); msg.className='devMsg bad'; } } }
  async function renderCoinShop(){ updateAllBalances();
    const soon=document.getElementById('coinSoon'); const packs=document.querySelectorAll('#coinPacks .coinPack');
    const billing = (typeof window.getDigitalGoodsService==='function') && await initBilling();
    if(!billing){   // Browser/iOS oder Dienst nicht erreichbar → Buttons aus, Hinweis zeigen
      packs.forEach(b=>{ b.disabled=true; });
      if(soon){ soon.textContent=(typeof window.getDigitalGoodsService!=='function')?t('iapSoon'):t('iapNoSvc'); soon.style.display=''; }
      return; }
    // WICHTIG: Sobald Billing verbunden ist, Buttons SOFORT aktivieren. Der Kauf läuft über Play
    // (PaymentRequest), das den Preis selbst auflöst – ein erfolgreicher getDetails ist dafür NICHT
    // nötig. Preise nur best-effort im Hintergrund nachladen (Fehler dabei egal). (Verhalten wie v205.)
    packs.forEach(b=>{ const n=parseInt(b.dataset.coins,10)||coinsFromId(b.dataset.sku); b.dataset.sku='coins_'+n; b.disabled=false;
      if(!b._wired){ b._wired=true; b.addEventListener('click',()=>{ if(!b.disabled) buyCoins(b.dataset.sku); }); } });
    if(soon) soon.style.display='none';
    billingSelfTest();   // sichtbare Diagnose (Details/Liste) – zeigt ohne PC, welcher Aufruf klemmt
    (async()=>{ for(const b of packs){ const n=parseInt(b.dataset.coins,10); try{ const d=(await detailsFor('coins_'+n))[0];
      if(d){ if(d.itemId) b.dataset.sku=d.itemId; const pr=b.querySelector('.cpPrice'), px=fmtPrice(d.price); if(px&&pr) pr.textContent=px; } }catch(e){} } })();
  }
  // Coin-Shop öffnet über dem gerade sichtbaren Screen (Menü/Werkstatt/Arsenal) und kehrt dorthin zurück
  // Coin-Tap aus dem laufenden Spiel (HUD-Zähler/Badge): erst pausieren → Run geht nicht verloren, Rückkehr über Pause
  function coinTapToShop(){ if(state===S.PLAY) pauseGame(); openCoinShop(); }
  function openCoinShop(){ const m=document.getElementById('coinMsg'); if(m){m.textContent='';m.className='devMsg';}
    const q=document.getElementById('coinQuip'); if(q){ const pool=COINQUIPS[lang]||COINQUIPS.de; q.textContent='„'+pick(pool)+'"'; }
    coinReturn=['continue','arsenalView','shop','over','upgrade','pause','settings','ach','statusView','start'].find(id=>{ const e=document.getElementById(id); return e && !e.classList.contains('hidden'); })||'start';
    document.getElementById(coinReturn).classList.add('hidden');
    renderCoinShop(); document.getElementById('coinshop').classList.remove('hidden'); beep(880,0.06,'square',0.2); }
  function closeCoinShop(){ document.getElementById('coinshop').classList.add('hidden');
    const e=document.getElementById(coinReturn||'start'); if(e) e.classList.remove('hidden'); updateAllBalances();
    if(pendingContinue && coinReturn==='continue') renderContinue(); }   // zurück aufs Weiterleben-Overlay → Button-Status (Guthaben/leistbar) auffrischen
  const OPTLBL={music:'optMusic',sfx:'optSfx',fullscreen:'optFull',shake:'optShake',fx:'optFx',madnessFx:'optMadness',curses:'optCurses',guns:'optGuns',dmg:'optDmg',telemetry:'optTelemetry',lang:'optLang'};
  // In der installierten App (TWA/PWA) läuft Vollbild NATIV (immersive) – ab dem ersten Frame,
  // also auch im Hauptmenü. Die JS-Fullscreen-API ist dort überflüssig: sie greift erst nach
  // einer Geste (Run-Start) und blendet den OS-Toast „Vollbildmodus aktiviert" ein. Daher in
  // diesem Modus komplett abschalten und das native Vollbild nutzen.
  const STANDALONE = (function(){ try{
    return (window.matchMedia && (matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: minimal-ui)').matches))
      || navigator.standalone===true || (document.referrer||'').indexOf('android-app://')===0;
  }catch(e){ return false; } })();
  const isFull=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
  function toggleFullscreen(){ if(STANDALONE) return; try{ const el=document.documentElement;
    if(!isFull()){ const r=el.requestFullscreen||el.webkitRequestFullscreen; if(r) r.call(el); }
    else { const x=document.exitFullscreen||document.webkitExitFullscreen; if(x) x.call(document); } }catch(e){} }
  function enterFullscreen(){ if(STANDALONE) return; try{ const el=document.documentElement, r=el.requestFullscreen||el.webkitRequestFullscreen; if(r){ const p=r.call(el); if(p&&p.catch) p.catch(()=>{}); } }catch(e){} }
  function exitFullscreen(){ try{ const x=document.exitFullscreen||document.webkitExitFullscreen; if(x&&isFull()) x.call(document); }catch(e){} }
  // Beim Spielstart (User-Geste) Fullscreen anfordern – nur wenn die Option an ist (Default: an) → OS-Statusleiste + Navigationsleiste/Bottom-Griff weg
  function goFullscreenSoft(){ if(opt.fullscreen===false||isFull()) return; enterFullscreen(); }
  // Live-Lautstärken auf die Audio-Busse anwenden (0..1)
  function applyVolumes(){ if(musicBus) musicBus.gain.value=volNum(opt.music); if(sfxGain) sfxGain.gain.value=volNum(opt.sfx); }
  // Lautstärke-Slider (Musik/Sound) mit aktuellen Werten + Labels synchronisieren
  function renderVolRows(){
    const sync=(slid,val,lblId,lblTxt)=>{ const s=document.getElementById(slid); if(s) s.value=Math.round(volNum(val)*100);
      const e=document.getElementById(lblId); if(e) e.textContent=Math.round(volNum(val)*100)+'%';
      const L=document.querySelector('.volrow[data-vol='+(slid==='volMusic'?'music':'sfx')+'] .vlbl'); if(L) L.textContent=lblTxt; };
    sync('volMusic',opt.music,'volMusicV',t('optMusic')); sync('volSfx',opt.sfx,'volSfxV',t('optSfx')); }
  function renderSettings(){ document.querySelectorAll('#optRows .optrow').forEach(row=>{
    const k=row.dataset.opt; let v;
    if(k==='lang') v=lang.toUpperCase();
    else if(k==='shake') v=(opt.shake===0?t('off'):(opt.shake<1?t('reduced'):t('on')));
    else if(k==='fullscreen') v=(opt.fullscreen?t('on'):t('off'));
    else v=(opt[k]?t('on'):t('off'));
    row.innerHTML=t(OPTLBL[k])+' · <b>'+v+'</b>'; }); { const tx=document.getElementById('tlmExportBtn'); if(tx) tx.textContent=t('tlmExport'); }
    { const ab=document.getElementById('advToggleBtn'),c=document.getElementById('advOpts'); if(ab&&c){ const open=!c.classList.contains('advCollapsed'); ab.innerHTML=t('advOpt')+' '+(open?'▾':'▸'); } }
    renderVolRows(); renderResetLabels(); }
  function cycleOpt(k){
    if(k==='lang'){ const order=['de','en','fr']; lang=order[(order.indexOf(lang)+1)%3]; saveLang(); applyI18n(); renderSettings(); beep(740,0.06,'square',0.2); return; }
    if(k==='fullscreen'){ opt.fullscreen=!opt.fullscreen; saveOpt(); if(opt.fullscreen) enterFullscreen(); else exitFullscreen(); renderSettings(); beep(opt.fullscreen?740:330,0.06,'square',0.2); return; }
    if(k==='shake') opt.shake=(opt.shake>=1?0.4:(opt.shake>0?0:1));
    else { opt[k]=!opt[k]; if(k==='telemetry') opt.tlmAsked=true; }   // manuelle Wahl gilt als beantwortet → Ersthinweis erscheint nicht mehr
    saveOpt(); renderSettings(); applyFx(); beep(opt[k]===false?330:740,0.06,'square',0.2); }
  // ---------- Einmaliger Statistik-Hinweis beim ersten Start (Ja/Nein) ----------
  function tlmConsentTexts(){ const set=(id,v,html)=>{ const e=document.getElementById(id); if(e){ if(html) e.innerHTML=v; else e.textContent=v; } };
    set('tlmcTitle',t('tlmcTitle')); set('tlmcBody',t('tlmcBody'),true); set('tlmcFoot',t('tlmcFoot')); set('tlmcYes',t('tlmcYes')); set('tlmcNo',t('tlmcNo')); }
  function showTlmConsent(){ const sc=document.getElementById('tlmConsent'); if(!sc) return; tlmConsentTexts(); sc.classList.remove('hidden'); sc.scrollTop=0; beep(660,0.05,'square',0.18); }
  function answerTlm(yes){ opt.telemetry=!!yes; opt.tlmAsked=true; saveOpt(); const sc=document.getElementById('tlmConsent'); if(sc) sc.classList.add('hidden'); if(typeof renderSettings==='function') renderSettings(); beep(yes?740:330,0.06,'square',0.2); vibe(8); }
  // ---------- Daten zurücksetzen (Teilaspekte + alles), je mit 2-Tap-Bestätigung ----------
  const RESETS={
    // „Hangar & Werkstatt": ALLES Gekaufte zurück auf Werkszustand – Chips, Werkstatt-Upgrades (meta.lvl),
    // Hangar-Loadout (Waffen/Fusionen/Verstärken) UND Skillpunkte. Vorher blieben Waffen & Skillpunkte erhalten → Bug.
    workshop:()=>{ meta.chips=0; meta.lvl={}; meta.research={active:null}; meta.loadout=null; meta.startKit=null; meta.ms={}; meta.sp=3; meta.spBought=0; saveMeta();   // Forschung mit leeren – sonst schließt ein altes Projekt ab und schenkt Stufen ins geleerte meta.lvl
      if(state===S.MENU){ skillPts=3; arsenal={slots:3,w:{}}; activeSyn=[]; synSeen={}; if(mods) mods.oc=0; }   // In-Memory nur im Menü angleichen (laufenden Run nicht stören)
      updateMenuChips(); },
    scores:()=>{ best={normal:0,hardcore:0,zen:0,daily:0,dailyDate:''}; saveScores(); },
    achskins:()=>{ meta.ach={}; meta.skins={}; meta.skin='std'; saveMeta(); shipSig=''; updateMenuChips(); },
    coach:()=>{ meta.seen=meta.seen||{}; Object.keys(meta.seen).forEach(k=>{ if(k==='howto'||k.indexOf('lore_')===0) return; delete meta.seen[k]; }); saveMeta(); },   // alle Coach-Lektionen (Kern + Effekte + Upgrades) leeren; Story/Howto bleibt
    all:()=>{ try{ ['thronerush_meta','thronerush_best','thronerush_opt','thronerush_lang','thronerush_run'].forEach(k=>localStorage.removeItem(k)); }catch(e){} try{ location.reload(); }catch(e){} }
  };
  let resetArmed=null, resetTimer=null;
  function resetLabel(btn){ btn.textContent=t('rs_'+btn.dataset.reset); btn.classList.remove('armed'); }
  function renderResetLabels(){ const rt=document.getElementById('resetTitle'); if(rt) rt.textContent=t('resetTitle');
    document.querySelectorAll('#resetRows .optrow').forEach(resetLabel); resetArmed=null; clearTimeout(resetTimer); }
  function armReset(btn){ const key=btn.dataset.reset;
    if(resetArmed===key){ clearTimeout(resetTimer); resetArmed=null; (RESETS[key]||function(){})();
      if(key!=='all'){ btn.textContent=t('rsDone'); btn.classList.remove('armed'); beep(523,0.12,'square',0.25); vibe([15,20,15]); setTimeout(()=>resetLabel(btn),1100); } }
    else { document.querySelectorAll('#resetRows .optrow').forEach(resetLabel); resetArmed=key; btn.textContent=t('reallyQ'); btn.classList.add('armed'); beep(200,0.1,'square',0.2,-50);
      clearTimeout(resetTimer); resetTimer=setTimeout(()=>{ resetArmed=null; resetLabel(btn); },4000); } }
  // Statische UI-Texte je Sprache setzen
  // ---------- Erfolge-Galerie ----------
  function openAch(){ document.getElementById('start').classList.add('hidden'); renderAch();
    document.getElementById('ach').classList.remove('hidden'); beep(660,0.06,'square',0.2); }
  function closeAch(){ document.getElementById('ach').classList.add('hidden'); document.getElementById('start').classList.remove('hidden'); }
  function renderAch(){ const got=ACH.filter(a=>meta.ach&&meta.ach[a.id]).length, sub=document.getElementById('achSub');
    if(sub) sub.textContent=got+'/'+ACH.length;
    const sp=document.getElementById('achStats');
    if(sp){ const rows=[['runs','🎮',statN('runs')],['orbs','🪙',statN('orbs')],['near','😎',statN('near')],['perfect','🎯',statN('perfect')],['bosses','🛸',statN('bosses')],['maxCombo','🔗','x'+statN('maxCombo')],['maxBoss','🌊',statN('maxBoss')],['chipsTotal','🪙',fmt(statN('chipsTotal'))],['won','🏆',meta.won||0]];
      const hs=(ico,label,v)=>'<div class="sttile hs"><span class="i">'+ico+'</span><b>'+fmt(v||0)+'</b><span class="l">'+label+'</span></div>';
      let hsTiles=hs('🏆',t('hiscores'),best&&best.normal);   // nur ein Modus → ein Bestwert
      sp.innerHTML='<div class="stHead">🏆 '+t('hiscores')+'</div><div class="stGrid">'+hsTiles+'</div>'
        +'<div class="stHead">'+stTxt('stats')+'</div><div class="stGrid">'+rows.map(r=>'<div class="sttile"><span class="i">'+r[1]+'</span><b>'+(typeof r[2]==='number'?fmt(r[2]):r[2])+'</b><span class="l">'+stTxt(r[0])+'</span></div>').join('')+'</div>'; }
    const mst=document.getElementById('msTitle'); if(mst){ const done=MILESTONES.filter(m=>meta.ms&&meta.ms[m.id]).length; mst.textContent=t('msTitle')+' · '+done+'/'+MILESTONES.length; }
    const msw=document.getElementById('msCards');
    if(msw){ msw.innerHTML=''; MILESTONES.forEach(m=>{ const done=!!(meta.ms&&meta.ms[m.id]); const bv=msBest(m), pct=Math.max(0,Math.min(100,Math.round(bv/m.need*100)));
      const c=document.createElement('div'); c.className='mcard'+(done?' done':'');
      c.innerHTML='<div class="mico">'+(done?'✓':MSICO[m.type])+'</div><div class="mmain"><b>'+msLabel(m)+'</b><span class="mrew">🪙 '+m.chips+'</span></div>'
        +(done?'':'<div class="mbar"><i style="width:'+pct+'%"></i></div><span class="mprog">'+fmt(Math.min(bv,m.need))+' / '+fmt(m.need)+'</span>');
      msw.appendChild(c); }); }
    const wrap=document.getElementById('achCards'); if(!wrap) return; wrap.innerHTML='';
    ACH.forEach(a=>{ const has=!!(meta.ach&&meta.ach[a.id]); const c=document.createElement('div'); c.className='acard'+(has?' got':' lock');
      c.innerHTML='<div class="ico">'+(has?a.ico:'🔒')+'</div><h5>'+achName(a.id)+'</h5><p>'+achDesc(a.id)+'</p>';
      wrap.appendChild(c); });
    // Story-Codex: entdeckte Lore-Beats (sonst „???")
    const ids=Object.keys(LORE), lgot=ids.filter(id=>meta.seen&&meta.seen['lore_'+id]).length;
    const lt=document.getElementById('loreTitle'); if(lt) lt.textContent=t('loreTitle')+' · '+lgot+'/'+ids.length;
    const lw=document.getElementById('loreCards'); if(lw){ lw.innerHTML='';
      ids.forEach(id=>{ const seen=!!(meta.seen&&meta.seen['lore_'+id]), tx=(LORE[id][lang]||LORE[id].en); const c=document.createElement('div'); c.className='lcard'+(seen?'':' lock');
        c.innerHTML=seen?('<h5>📖 '+tx[0]+'</h5><p>'+tx[1]+'</p>'):('<h5>🔒 ???</h5><p>'+t('loreLocked')+'</p>');
        if(seen) c.addEventListener('click',()=>showLore(id));   // entdeckten Beat groß nachlesen
        lw.appendChild(c); }); }
    // Mechanik-Codex: Kern-Lektionen + entdeckte Effekte + Gegner (sonst „???")
    const CODEX_FX=[['crithit','cefCrit','cefCritd','#ff2e6e'],['pmagnet','cefMag','cefMagd','#c45bff'],['pslow','cefSlow','cefSlowd','#5b9bff'],['pdouble','cefDbl','cefDbld','#ffe600'],['pbomb','cefBomb','cefBombd','#ff9a2e'],['life','cefLife','cefLifed','#ff4d6d']];
    const CODEX_ENEMY=[['enemy_elite','ceElite','ceEliteD','#c45bff'],['enemy_flank','ceFlank','ceFlankD','#ff3a3a'],['enemy_shield','ceShield','ceShieldD','#2effc0']];
    const allCK=LESSON_ORDER.concat(CODEX_FX.map(e=>e[0]),CODEX_ENEMY.map(e=>e[0])), cgot=allCK.filter(k=>meta.seen&&meta.seen[k]).length;
    const ct=document.getElementById('codexTitle'); if(ct) ct.textContent=t('codexTitle')+' · '+cgot+'/'+allCK.length;
    const cw=document.getElementById('codexCards'); if(cw){ cw.innerHTML='';
      const addC=(seen,col,title,desc)=>{ const c=document.createElement('div'); c.className='lcard'+(seen?'':' lock'); c.innerHTML=seen?('<h5 style="color:'+col+'">'+title+'</h5><p>'+desc+'</p>'):('<h5>🔒 ???</h5><p>'+t('codexLocked')+'</p>'); cw.appendChild(c); };
      const SEPL={de:['⚙️ MECHANIK','✨ EFFEKTE','👾 GEGNER','🔫 WAFFEN','🧬 SYNERGIEN'],en:['⚙️ MECHANICS','✨ EFFECTS','👾 ENEMIES','🔫 WEAPONS','🧬 SYNERGIES'],fr:['⚙️ MÉCANIQUES','✨ EFFETS','👾 ENNEMIS','🔫 ARMES','🧬 SYNERGIES']}, SL=SEPL[lang]||SEPL.en;
      const sep=l=>{ const d=document.createElement('div'); d.style.cssText='flex:1 0 100%;width:100%;grid-column:1/-1;font:700 12px Orbitron,sans-serif;opacity:.55;margin:10px 2px 2px;letter-spacing:1px'; d.textContent=l; cw.appendChild(d); };
      sep(SL[0]); LESSON_ORDER.forEach(k=>{ const L=LESSONS[k]||{col:'#19f0ff'}; addC(!!(meta.seen&&meta.seen[k]),L.col,t('coach_'+k),t('coach_'+k+'d')); });
      sep(SL[1]); CODEX_FX.forEach(e=>addC(!!(meta.seen&&meta.seen[e[0]]),e[3],t(e[1]),t(e[2])));
      sep(SL[2]); CODEX_ENEMY.forEach(e=>addC(!!(meta.seen&&meta.seen[e[0]]),e[3],t(e[1]),t(e[2])));
      sep(SL[3]); WEAPONS.forEach(w=>addC(true,w.col,w.ico+' '+wName(w.id),wDesc(w.id)));   // volle Waffen-Referenz
      sep(SL[4]); SYNERGIES.forEach(sy=>{ const a=WID[sy.pair[0]],b=WID[sy.pair[1]]; addC(true,'#ff2e88',sy.ico+' '+synName(sy.id)+' ('+(a?a.ico:'')+'+'+(b?b.ico:'')+')',synDesc(sy.id)); }); } }
  // ---------- Schiffsstatus / Gefechtsdatenblatt ----------
  const RAXIS={de:{power:'Feuerkraft',prec:'Präzision',area:'Fläche',control:'Kontrolle',surv:'Robustheit',combo:'Combo'},
    en:{power:'Firepower',prec:'Precision',area:'Area',control:'Control',surv:'Toughness',combo:'Combo'},
    fr:{power:'Puissance',prec:'Précision',area:'Zone',control:'Contrôle',surv:'Robustesse',combo:'Combo'}};
  const rName=k=>((RAXIS[lang]&&RAXIS[lang][k])||RAXIS.en[k]||k);
  function openStatusView(){ if(state!==S.MENU && state!==S.PAUSE) return;
    statusFromMenu=(state===S.MENU);
    if(statusFromMenu){ if(!mode) mode='normal'; reset(); applyMeta(); document.getElementById('start').classList.add('hidden'); }
    else document.getElementById('pause').classList.add('hidden');   // aus Pause: Pause ausblenden (Glas sonst durchscheinend)
    renderStatusView();
    const sv=document.getElementById('statusView'); if(sv){ sv.classList.remove('hidden'); sv.scrollTop=0; } beep(660,0.06,'square',0.2); }
  // Aus dem Arsenal heraus den Schiffsstatus zeigen (aktuelles Loadout, kein reset) → zurück ins Arsenal
  function openStatusFromArsenal(){ statusFromArsenal=true; const av=document.getElementById('arsenalView'); if(av) av.classList.add('hidden');
    renderStatusView(); const sv=document.getElementById('statusView'); if(sv){ sv.classList.remove('hidden'); sv.scrollTop=0; } beep(660,0.06,'square',0.2); }
  function closeStatusView(){ const sv=document.getElementById('statusView'); if(sv) sv.classList.add('hidden');
    if(statusFromArsenal){ statusFromArsenal=false; const av=document.getElementById('arsenalView'); if(av){ renderArsenalView(); av.classList.remove('hidden'); av.scrollTop=0; } return; }
    if(statusFromMenu){ statusFromMenu=false; state=S.MENU; document.getElementById('start').classList.remove('hidden'); return; }
    document.getElementById('pause').classList.remove('hidden'); }   // aus Pause geöffnet → zurück zur Pause
  function drawRadar(cv,axes){ const dpr=Math.min(2,window.devicePixelRatio||1), size=300;
    cv.width=size*dpr; cv.height=size*dpr; cv.style.width=size+'px'; cv.style.height=size+'px';
    const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,size,size);
    const cx=size/2, cy=size/2, R=size*0.30, n=axes.length, ang=i=>-Math.PI/2+i*2*Math.PI/n;
    g.lineWidth=1;
    for(let r=1;r<=4;r++){ g.beginPath(); for(let i=0;i<n;i++){ const a=ang(i),rr=R*r/4,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr; i?g.lineTo(x,y):g.moveTo(x,y); } g.closePath(); g.strokeStyle='rgba(25,240,255,'+(0.07+r*0.03)+')'; g.stroke(); }
    g.strokeStyle='rgba(25,240,255,.14)'; for(let i=0;i<n;i++){ const a=ang(i); g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R); g.stroke(); }
    g.beginPath(); for(let i=0;i<n;i++){ const a=ang(i),rr=R*Math.max(0.02,axes[i].val/100),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr; i?g.lineTo(x,y):g.moveTo(x,y); } g.closePath();
    g.fillStyle='rgba(25,240,255,.16)'; g.fill(); g.lineWidth=2; g.strokeStyle='#19f0ff'; g.shadowBlur=10; g.shadowColor='#19f0ff'; g.stroke(); g.shadowBlur=0;
    g.textAlign='center'; g.textBaseline='middle';
    for(let i=0;i<n;i++){ const a=ang(i),rr=R*Math.max(0.02,axes[i].val/100),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
      g.fillStyle='#19f0ff'; g.beginPath(); g.arc(x,y,2.6,0,6.28); g.fill();
      const lx=cx+Math.cos(a)*(R+24), ly=cy+Math.sin(a)*(R+20);
      g.font='14px serif'; g.fillStyle='#dff4ff'; g.fillText(axes[i].ico,lx,ly-12);
      g.font="700 8px 'Orbitron',sans-serif"; g.fillStyle='#9fd6ee'; g.fillText(rName(axes[i].key).toUpperCase(),lx,ly+1);
      g.font="700 14px 'VT323',monospace"; g.fillStyle='#19f0ff'; g.fillText(Math.round(axes[i].val),lx,ly+14); } }
  function renderStatusView(){ const s=computeShipStats();
    const sub=document.getElementById('statusSub'); if(sub) sub.textContent='⚔ '+ownedW().length+' · 🔗 '+s.syns.length+' · '+t('statEst').toUpperCase();
    const cv=document.getElementById('radarCanvas'); if(cv) drawRadar(cv,s.radar);
    const leg=document.getElementById('statusLegend'); if(leg){ leg.innerHTML=s.radar.map(a=>'<span class="rlg"><b>'+a.ico+'</b> '+rName(a.key)+' <i>'+Math.round(a.val)+'</i></span>').join(''); }
    const tele=document.getElementById('statusTele'); if(tele){ const pc=v=>Math.round(v)+'%', mx=v=>'×'+(Math.round(v*100)/100);
      const rows=[['💥',t('statDps'),fmt(Math.round(s.dps))],['🎯',t('statCrit'),pc(s.crit*100)],['💢',t('statCritDmg'),mx(s.critMult)],
        ['❤️',t('statLives'),s.lives],['🛡️',t('statShield'),s.shields],['🦘',t('statJump'),s.jumpMax],
        ['💎',t('statScore'),'+'+pc((s.scoreMult-1)*100)],['🪙',t('statCoin'),mx(s.coinMult)],['🍀',t('statLuck'),'+'+pc((s.luck-1)*100)],
        ['◎',t('statHull'),Math.round(s.hull)],['📡',t('statReach'),Math.round(s.nearR)]];
      if(s.oc>0) rows.push(['🔆',t('statOC'),'+'+pc(s.oc*6)]);
      tele.innerHTML='<div class="stGrid">'+rows.map(r=>'<div class="sttile"><span class="i">'+r[0]+'</span><b>'+r[2]+'</b><span class="l">'+r[1]+'</span></div>').join('')+'</div>'; }
    const weps=document.getElementById('statusWeps'); if(weps){ const max=s.perW.length?s.perW[0].dps:1;
      let h='<div class="stHead">🔥 '+t('statFirepower')+' <small>('+t('statEst')+')</small></div>';
      if(!s.perW.length) h+='<p class="statEmpty">'+t('statNoWep')+'</p>';
      else h+=s.perW.map(p=>{ const w=WID[p.id], pcw=Math.max(7,Math.round(p.dps/max*100));
        return '<div class="statBar"><span class="sbIco" style="color:'+w.col+'">'+w.ico+'</span><span class="sbName">'+wName(p.id)+'</span><span class="sbTrack"><i style="width:'+pcw+'%;background:'+w.col+';box-shadow:0 0 8px '+w.col+'"></i></span><span class="sbVal">'+fmt(Math.round(p.dps))+'</span></div>'; }).join('');
      if(s.syns.length) h+='<div class="stHead">🔗 '+t('synTitle')+'</div><div class="statSyns">'+s.syns.map(id=>'<span class="statSyn">'+SID[id].ico+' '+synName(id)+'</span>').join('')+'</div>';
      weps.innerHTML=h; } }
  // ---------- Skins ----------
  // ---------- Pixel-Schiff-Editor ----------
  const EDHW=5, EDROWS=16;                                   // halbe Breite (cx 0..5 → gespiegelt 11 breit) × 16 Zeilen
  const EDPAL=['#19f0ff','#ff2e88','#ffe600','#7cff2e','#c45bff','#ff9a2e','#caffff','#16384a'];
  const ED_TEMPLATES=[
    {name:'Pfeil', d:[[0,2,6],[0,3,0],[0,4,0],[0,5,0],[0,6,0],[0,7,0],[1,5,0],[1,6,0],[1,7,4],[2,7,4],[0,8,1]]},
    {name:'Jäger', d:[[0,2,6],[0,3,0],[0,4,0],[0,5,0],[0,6,0],[1,4,0],[2,5,4],[3,6,4],[1,7,0],[0,7,1]]},
    {name:'Block', d:[[0,3,6],[0,4,0],[0,5,0],[0,6,0],[1,4,0],[1,5,0],[1,6,0],[2,5,0],[0,7,1],[1,7,1]]}
  ];
  let edCells={}, edColor=EDPAL[0], edGlow=false, edErase=false, edPaintActive=false, edGeo=null, edSlot=-1, edReturn='shop';
  const edUsed=()=>Object.keys(edCells).length;
  function openShipEditor(slot){ const L=shipList(); const exist=(slot!=null&&slot>=0&&L[slot]);
    edSlot = exist ? slot : -1;
    edCells = exist ? JSON.parse(JSON.stringify(L[slot].cells||{})) : {};
    const nm=document.getElementById('edName'); if(nm) nm.value = exist ? (L[slot].name||'') : (t('shipDefault')+' '+(L.length+1));
    edColor=EDPAL[0]; edErase=false; edGlow=false;
    edReturn=['arsenalView','shop','start'].find(id=>{ const e=document.getElementById(id); return e && !e.classList.contains('hidden'); })||'start';   // Editor aus dem Hub (Werkstatt/Skins) ODER Startseite
    document.getElementById(edReturn).classList.add('hidden');
    const ed=document.getElementById('shipEditor'); ed.classList.remove('hidden'); ed.scrollTop=0; renderEditor(); sfxUpgrade(); }
  function closeShipEditor(){ document.getElementById('shipEditor').classList.add('hidden');
    document.getElementById(edReturn||'start').classList.remove('hidden'); if(edReturn==='arsenalView') renderArsenalView(); else if(edReturn==='shop') renderShop(); }
  function edRefreshBudget(){ const max=pixBudget(), used=edUsed();
    const bd=document.getElementById('edBudget'); if(bd) bd.textContent=t('pixels')+': '+used+'/'+max;
    const fill=document.getElementById('edBudgetFill'); if(fill) fill.style.width=Math.min(100,max?used/max*100:0)+'%'; }
  function renderEditor(){ edRefreshBudget();
    const pal=document.getElementById('edPalette'); if(pal){ pal.innerHTML='';
      EDPAL.forEach(c=>{ const sw=document.createElement('div'); sw.className='sw'+(!edErase&&edColor===c?' on':''); sw.style.background=c; sw.style.color=c;
        sw.addEventListener('click',()=>{ edColor=c; edErase=false; renderEditor(); }); pal.appendChild(sw); });
      const er=document.createElement('div'); er.className='sw eraser'+(edErase?' on':''); er.textContent='⌫';
      er.addEventListener('click',()=>{ edErase=true; renderEditor(); }); pal.appendChild(er); }
    const tools=document.getElementById('edTools'); if(tools){ tools.innerHTML='';
      if(glowUnlocked()){ const g=document.createElement('button'); g.className=edGlow?'buy':''; g.textContent='✨ Glow: '+(edGlow?t('on'):t('off'));
        g.addEventListener('click',()=>{ edGlow=!edGlow; edErase=false; renderEditor(); }); tools.appendChild(g); }
      else { const gm=metaById('pxglow'), cost=metaCost(gm,0), aff=(meta.chips||0)>=cost; const g=document.createElement('button'); g.className='buy'+(aff?'':' lock'); g.textContent='✨ '+t('glowUnlock')+' 🪙'+cost;
        g.addEventListener('click',()=>{ buyMeta('pxglow'); renderEditor(); }); tools.appendChild(g); }
      const pm=metaById('pxpack'), lvl=metaLvl('pxpack');
      if(lvl<pm.max){ const cost=metaCost(pm,lvl), aff=(meta.chips||0)>=cost; const p=document.createElement('button'); p.className='buy'+(aff?'':' lock'); p.textContent='➕'+PIX_PER+' '+t('pixels')+' 🪙'+cost;
        p.addEventListener('click',()=>{ buyMeta('pxpack'); renderEditor(); }); tools.appendChild(p); } }
    const tpl=document.getElementById('edTemplates'); if(tpl){ tpl.innerHTML='<div class="tplLbl">'+t('templates')+'</div>';
      ED_TEMPLATES.forEach((T,i)=>{ const b=document.createElement('button'); b.textContent=T.name; b.addEventListener('click',()=>loadTemplate(i)); tpl.appendChild(b); }); }
    drawEditorCanvas(); }
  function drawEditorCanvas(){ const cv=document.getElementById('editCanvas'); if(!cv) return; const x=cv.getContext('2d');
    const cols=2*EDHW+1, rows=EDROWS, cell=Math.floor(Math.min(cv.width/cols, cv.height/rows));
    const gw=cols*cell, gh=rows*cell, ox=(cv.width-gw)/2, oy=(cv.height-gh)/2; edGeo={cell,ox,oy,cols,rows};
    x.clearRect(0,0,cv.width,cv.height);
    x.fillStyle='rgba(25,240,255,.05)'; x.fillRect(ox+EDHW*cell,oy,cell,gh);             // Mittelachse (Spiegel)
    x.strokeStyle='rgba(255,255,255,.07)'; x.lineWidth=1;
    for(let c=0;c<=cols;c++){ x.beginPath(); x.moveTo(ox+c*cell+.5,oy); x.lineTo(ox+c*cell+.5,oy+gh); x.stroke(); }
    for(let r2=0;r2<=rows;r2++){ x.beginPath(); x.moveTo(ox,oy+r2*cell+.5); x.lineTo(ox+gw,oy+r2*cell+.5); x.stroke(); }
    for(const k in edCells){ const p=k.split(','),cx=+p[0],cy=+p[1],cl=edCells[k],c=(cl&&cl.c)||cl,g=cl&&cl.g;
      [EDHW+cx,EDHW-cx].forEach(col=>{ const px=ox+col*cell,py=oy+cy*cell;
        if(g){ x.save(); x.shadowBlur=9; x.shadowColor=c; } x.fillStyle=c; x.fillRect(px+1,py+1,cell-2,cell-2); if(g) x.restore(); }); } }
  function edCellAt(clientX,clientY){ const cv=document.getElementById('editCanvas'); if(!cv||!edGeo) return null; const r=cv.getBoundingClientRect();
    const sx=cv.width/r.width, sy=cv.height/r.height, px=(clientX-r.left)*sx, py=(clientY-r.top)*sy;
    const col=Math.floor((px-edGeo.ox)/edGeo.cell), row=Math.floor((py-edGeo.oy)/edGeo.cell);
    if(col<0||col>=edGeo.cols||row<0||row>=edGeo.rows) return null; return {ccx:Math.abs(col-EDHW), row}; }
  function edPaint(ccx,row){ if(ccx<0||ccx>EDHW||row<0||row>=EDROWS) return; const key=ccx+','+row;
    if(edErase){ if(edCells[key]){ delete edCells[key]; drawEditorCanvas(); edRefreshBudget(); } return; }
    const cur=edCells[key]; if(cur && cur.c===edColor && !!cur.g===edGlow) return;
    if(!cur && edUsed()>=pixBudget()){ beep(200,0.1,'square',0.2,-60); vibe(20); return; }   // Budget voll → Pixel-Paket kaufen
    edCells[key]={c:edColor,g:edGlow?1:0}; drawEditorCanvas(); edRefreshBudget(); beep(880,0.02,'square',0.05,200); }
  function loadTemplate(i){ const T=ED_TEMPLATES[i]; if(!T) return; edCells={};
    for(const [cx,cy,ci] of T.d) edCells[cx+','+cy]={c:EDPAL[ci]||EDPAL[0],g:0}; renderEditor(); sfxUpgrade(); }
  function clearCustomEdit(){ edCells={}; drawEditorCanvas(); edRefreshBudget(); beep(300,0.1,'sawtooth',0.2,-80); }
  function saveCustomShip(){ if(!edUsed()){ beep(200,0.12,'square',0.2,-60); return; }
    const L=shipList(); const nmEl=document.getElementById('edName'); const name=((nmEl&&nmEl.value)||'').trim().slice(0,16) || (t('shipDefault')+' '+(L.length+1));
    const ship={name,cells:JSON.parse(JSON.stringify(edCells))};
    let slot=edSlot;
    if(slot>=0 && L[slot]) L[slot]=ship;
    else { if(L.length>=MAXSHIPS){ beep(200,0.12,'square',0.2,-60); return; } L.push(ship); slot=L.length-1; }
    meta.shipSlot=slot; meta.skin='custom'; saveMeta(); shipSig=''; sfxUpgrade(); vibe([15,20,15]); updateMenuChips(); closeShipEditor(); }
  function deleteShip(slot){ const L=shipList(); if(slot<0||slot>=L.length) return; L.splice(slot,1);
    if(meta.shipSlot>=L.length) meta.shipSlot=Math.max(0,L.length-1);
    if(meta.skin==='custom' && !L.length) meta.skin='std';
    saveMeta(); shipSig=''; beep(260,0.12,'sawtooth',0.25,-90); renderShop(); }
  function selectShip(slot){ const L=shipList(); if(!L[slot]) return; meta.shipSlot=slot; selectSkin('custom'); }
  function refreshSkinUIs(){ const sh=document.getElementById('shop'); if(sh&&!sh.classList.contains('hidden')) renderShop(); }
  function selectSkin(id){ meta.skin=id; saveMeta(); shipSig=''; beep(740,0.06,'square',0.2); refreshSkinUIs(); }
  function buySkin(id){ const s=SKINS.find(x=>x.id===id); if(!s||!s.cost) return; if(coinShort(s.cost)) return;
    meta.chips-=s.cost; unlockSkin(id); meta.skin=id; saveMeta(); shipSig=''; sfxUpgrade(); vibe([15,20,15]); refreshSkinUIs(); updateMenuChips(); }
  function skinCards(wrap){ if(!wrap) return; wrap.innerHTML='';
    // PROMINENT ganz oben: eigenes Schiff bauen (Pixel-Editor)
    if(shipList().length<MAXSHIPS){ const nc=document.createElement('button'); nc.className='editorBanner';
      nc.innerHTML='<span class="ebIco">🎨</span><span class="ebTxt"><b>'+t('shipDesigner')+'</b><small>'+t('newShip')+'</small></span><span class="ebPlus">＋</span>';
      nc.addEventListener('click',()=>openShipEditor(-1)); wrap.appendChild(nc); }
    SKINS.forEach(s=>{ const unlocked=(s.id==='std')||(meta.skins&&meta.skins[s.id])||(!s.ach&&!s.cost), active=(meta.skin||'std')===s.id;
      const card=document.createElement('div'); card.className='skcard'+(active?' act':'');
      const prevBg=s.rnd?'linear-gradient(135deg,#ff2e88,#19f0ff,#ffe600)':s.hull;
      let btn;
      if(active) btn='<div class="pick on">'+t('active')+'</div>';
      else if(unlocked) btn='<button class="pick" data-sk="'+s.id+'" data-act="sel">'+t('choose')+'</button>';
      else if(s.cost){ const aff=(meta.chips||0)>=s.cost; btn='<button class="pick'+(aff?'':' lock')+'" data-sk="'+s.id+'" data-act="buy">🪙 '+s.cost+'</button>'; }
      else btn='<div class="pick lock">🏅 '+achName(s.ach)+'</div>';
      card.innerHTML='<div class="prev" style="background:'+prevBg+';border-color:'+s.edge+'"></div><h5>'+skinName(s.id)+'</h5>'+btn;
      const b=card.querySelector('button.pick'); if(b) b.addEventListener('click',()=>{ b.dataset.act==='buy'?buySkin(s.id):selectSkin(s.id); });
      wrap.appendChild(card); });
    // Garage: gespeicherte eigene Schiffe (auswählen/bearbeiten/löschen) + neues Schiff
    const L=shipList();
    L.forEach((s,i)=>{ const active=(meta.skin==='custom' && (meta.shipSlot||0)===i);
      const card=document.createElement('div'); card.className='skcard'+(active?' act':'');
      const cv=document.createElement('canvas'); cv.className='shipPrev'; cv.width=64; cv.height=64;
      const sp=buildSpriteFromCells(s.cells,12), cx=cv.getContext('2d'); const sc=Math.min(56/sp.cv.width,56/sp.cv.height);
      cx.imageSmoothingEnabled=false; cx.drawImage(sp.cv,32-sp.cv.width*sc/2,32-sp.cv.height*sc/2,sp.cv.width*sc,sp.cv.height*sc);
      card.appendChild(cv);
      const h=document.createElement('h5'); h.textContent=s.name||(t('shipDefault')+' '+(i+1)); card.appendChild(h);
      const row=document.createElement('div'); row.className='skrow';
      const pick=document.createElement('button'); pick.textContent=active?t('active'):t('choose'); if(active) pick.className='on'; else pick.addEventListener('click',()=>selectShip(i));
      const ed=document.createElement('button'); ed.textContent='✏️'; ed.title=t('edit'); ed.addEventListener('click',()=>openShipEditor(i));
      const del=document.createElement('button'); del.className='del'; del.textContent='🗑️'; del.title=t('del'); del.addEventListener('click',()=>deleteShip(i));
      row.appendChild(pick); row.appendChild(ed); row.appendChild(del); card.appendChild(row);
      wrap.appendChild(card); }); }
  const MODEMETA={normal:{emblem:'🎮'},hardcore:{emblem:'⚡'},zen:{emblem:'🧘'}};
  // Mode-Karten grafisch: großes Emblem + Feature-Chips (Icons statt Fließtext), Volltext per ⓘ-Tooltip
  function renderModes(){ document.querySelectorAll('.mode').forEach(c=>{ const dm=c.dataset.mode, m=(dm==='hardcore'?'hard':dm);
    const emblem=(MODEMETA[dm]||{}).emblem||'🎮', name=t('m_'+m), desc=t('m_'+m+'D');
    const chips=(t('mfeat_'+m)||'').split('|').map(s=>'<span class="mchip">'+s.trim()+'</span>').join('');
    c.innerHTML='<div class="memblem">'+emblem+'</div><h3>'+name+'</h3><div class="mfeat">'+chips+'</div>'+infoBtn(name,desc,'minfo');
    const ib=c.querySelector('.minfo'); if(ib) ib.addEventListener('click',e=>{ e.stopPropagation(); showTip(name,desc,ib); }); }); }
  function applyI18n(){ try{ document.documentElement.lang=lang;
    const set=(id,v,html)=>{ const e=document.getElementById(id); if(e){ if(html) e.innerHTML=v; else e.textContent=v; } };
    const setSel=(sel,v,html)=>{ const e=document.querySelector(sel); if(e){ if(html) e.innerHTML=v; else e.textContent=v; } };
    const setIco=(id,ico,lbl,short)=>{ const e=document.getElementById(id); if(e){ const i=e.querySelector('.ico'); if(i) i.textContent=ico; else e.textContent=ico; const l=e.querySelector('.iconLbl'); if(l&&short!=null) l.textContent=short; e.title=lbl; } };
    set('titleTag',t('tag')); set('playBtn',t('playBtn')); set('shopLbl',t('hangar'));
    set('howTitle',t('howTitle')); set('howtoBtn',t('howGo')); set('howDodge',t('howDodge')); set('howDodgeD',t('howDodgeD'));
    setIco('achBtn','🏅',t('achBtn'),t('il_ach')); setIco('settingsBtn','⚙️',t('settings'),t('il_set')); setIco('shipBtn','🎨',t('shipDesigner'),t('il_ship')); setIco('statusBtn','📊',t('statusBtn'),t('il_status'));
    { const cl=document.querySelector('#coinBtn .iconLbl'); if(cl) cl.textContent=t('il_coin'); }
    setSel('.how',t('how'),true); set('installBtn',t('install')); set('iosHint',t('ios'),true);
    renderModes();
    setSel('#pause .utitle',t('pause')); set('resumeBtn',t('resume')); set('pauseMenuBtn',t('mainmenu')); set('arsenalViewBtn',t('arsenalBtn')); set('pauseSettingsBtn','⚙️ '+t('setTitle'));
    setSel('#arsenalView .utitle',t('arsenalTitle')); set('arsenalBackBtn',t('back')); set('arsenalStatusBtn','📊 '+t('statusBtn'));
    setSel('#upgrade .utitle',t('chooseUp'));
    setSel('#shop .utitle',t('workshop')); set('balLbl',t('balance')); set('shopBackBtn',t('back'));
    setSel('#settings .utitle',t('setTitle')); set('setHint',t('tapToggle')); set('settingsBackBtn',t('back'));
    setSel('#ach .utitle',t('achTitle')); set('achBackBtn',t('back'));
    set('statusTitle',t('statusTitle')); set('statusBackBtn',t('back'));
    setSel('#over .gover',t('crash')); set('newrec',t('newRec')); set('againBtn',t('again')); set('overShopBtn','🚀 '+t('workshop')); set('shareBtn',t('share')); set('menuBtn',t('menu'));
    const lbls=document.querySelectorAll('#over .scorebox .lbl'); if(lbls[0])lbls[0].textContent=t('points'); if(lbls[1])lbls[1].textContent=t('record');
    set('balLbl2',t('balance')); set('arsenalBackBtn',t('back'));
    set('coinBalLbl',t('coinBalLbl')); set('coinSoon',t('coinSoon')); set('coinBackBtn',t('back'));
    setIco('lbBtn','🏆',t('lbView'),t('il_lb')); set('saveScoreBtn',t('lbSave')); set('lbBackBtn',t('lbBack')); set('lbTitleEl',t('lbTitle'));
    if(typeof tlmConsentTexts==='function') tlmConsentTexts();
    if(typeof renderSettings==='function') renderSettings();
    if(typeof renderDiffInfo==='function') renderDiffInfo();
  }catch(e){} }

  // ---------- Menü-Belebung: Kettenblitz (Button→Button) + Schweißglut am Hangar – Glow-Look wie im Spiel ----------
  let mfxCv=null, mfxX=null, mfxBolts=[], mfxSparks=[], mfxChainT=0.8, mfxWeldT=0, mfxWeld={x:0,y:0,glow:0}, mfxW=0, mfxH=0;
  const MFX_COLS=['#19f0ff','#ff2e88','#c45bff','#ffe600'];
  const mfxHexA=(h,a)=>{ const n=parseInt(h.slice(1),16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; };
  function mfxResize(s){ const r=s.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1);
    mfxW=r.width; mfxH=r.height; mfxCv.width=Math.max(1,(r.width*dpr)|0); mfxCv.height=Math.max(1,(r.height*dpr)|0);
    mfxX.setTransform(dpr,0,0,dpr,0,0); }
  function mfxRect(s,el){ const sr=s.getBoundingClientRect(), r=el.getBoundingClientRect();
    return {x:r.left-sr.left+r.width/2, y:r.top-sr.top+r.height/2, left:r.left-sr.left, top:r.top-sr.top, w:r.width, h:r.height}; }
  // gezackter Blitzbogen (wie spawnLaserWave/arcParticles im Spiel): seitlicher Versatz an Zwischenpunkten
  function mfxJag(a,b){ const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1, nx=-dy/len, ny=dx/len;
    const segs=Math.max(4,Math.min(9,(len/26)|0)), pts=[[a.x,a.y]];
    for(let i=1;i<segs;i++){ const t=i/segs, j=(Math.random()-0.5)*Math.min(34,len*0.3); pts.push([a.x+dx*t+nx*j, a.y+dy*t+ny*j]); }
    pts.push([b.x,b.y]); return pts; }
  function mfxBolt(a,b,col,depth){ if(mfxBolts.length>18) mfxBolts.shift();
    mfxBolts.push({pts:mfxJag(a,b),t:0.3,life:0.3,col,branch:!!depth});
    if(!depth && Math.random()<0.7){ const pts=mfxBolts[mfxBolts.length-1].pts;   // ein dezenter Abzweig
      const v=pts[1+((Math.random()*(pts.length-2))|0)], ang=Math.random()*6.28, bl=16+Math.random()*30;
      mfxBolt({x:v[0],y:v[1]},{x:v[0]+Math.cos(ang)*bl,y:v[1]+Math.sin(ang)*bl},col,1); } }
  function mfxSpark(x,y,col,vx,vy,life,r){ if(mfxSparks.length>140) mfxSparks.shift();
    mfxSparks.push({x,y,vx,vy,life,maxlife:life,col,r:r||(2+Math.random()*2)}); }
  function mfxSplash(x,y,col,n){ for(let i=0;i<n;i++){ const a=Math.random()*6.28, sp=26+Math.random()*110;
    mfxSpark(x,y,col,Math.cos(a)*sp,Math.sin(a)*sp-20,0.34+Math.random()*0.4,2+Math.random()*2.4); } }
  function mfxFlash(el,cls,ms){ try{ el.classList.add(cls); setTimeout(()=>el.classList.remove(cls),ms); }catch(e){} }
  // weiche, glühende Linie in 3 Schichten (wie die Kettenblitze im Spiel)
  function mfxStroke(x,pts,col,a,coreW,wide){ x.lineCap='round'; x.lineJoin='round';
    x.beginPath(); x.moveTo(pts[0][0],pts[0][1]); for(let k=1;k<pts.length;k++) x.lineTo(pts[k][0],pts[k][1]);
    x.strokeStyle=mfxHexA(col,0.4*a); x.lineWidth=wide; x.stroke();
    x.strokeStyle=mfxHexA(col,0.7*a); x.lineWidth=coreW*1.9; x.stroke();
    x.strokeStyle='rgba(255,255,255,'+(0.85*a)+')'; x.lineWidth=coreW; x.stroke(); }
  function mfxDot(x,sp){ const a=Math.max(0,Math.min(1,sp.life/(sp.maxlife||0.5)*1.4)), s=Math.max(1,sp.r); x.fillStyle=sp.col;   // eckige Partikel wie im Spiel (Halo + Kern als fillRect)
    x.globalAlpha=a*0.35; x.fillRect(Math.round(sp.x-s),Math.round(sp.y-s),Math.round(s*2),Math.round(s*2));
    x.globalAlpha=a;      x.fillRect(Math.round(sp.x-s/2),Math.round(sp.y-s/2),Math.round(s),Math.round(s)); }
  function mfxFrame(dt){
    const s=document.getElementById('start');
    if(!s||s.classList.contains('hidden')){ if(mfxBolts.length||mfxSparks.length){ mfxBolts.length=0; mfxSparks.length=0; mfxWeld.glow=0; if(mfxX&&mfxW) mfxX.clearRect(0,0,mfxW,mfxH); } return; }
    if(!mfxCv){ mfxCv=document.getElementById('menuFx'); if(!mfxCv) return; mfxX=mfxCv.getContext('2d'); }
    const r=s.getBoundingClientRect(); if(Math.abs(r.width-mfxW)>1||Math.abs(r.height-mfxH)>1) mfxResize(s);
    if(!mfxX) return;
    const lg=s.querySelector('.logo'); const anchor=lg?(()=>{ const c=mfxRect(s,lg); return {x:c.x,y:c.top+c.h*0.94}; })():null;
    // Kettenblitz: vom Titel zum nächstgelegenen Button, dann von Button zu Button weiterspringen (wie im Spiel)
    // – unregelmäßige, etwas langsamere Abstände; der einschlagende Blitz triggert synchron den Titel-Glitch
    mfxChainT-=dt; if(mfxChainT<=0){ mfxChainT=1.7+Math.random()*1.6+(Math.random()<0.4?Math.random()*2.4:0);   // unregelmäßig + minimal langsamer
      let pool=[...s.querySelectorAll('#playBtn, #shopBtn, .iconRow button, .diffBtn')].filter(e=>e.offsetParent!==null).map(el=>({el,c:mfxRect(s,el)}));
      if(pool.length){ const col=MFX_COLS[(Math.random()*MFX_COLS.length)|0]; let prev=anchor||pool[0].c; const hops=Math.min(pool.length,3+(Math.random()*3|0));
        if(lg){ lg.classList.remove('glitch'); void lg.offsetWidth; lg.classList.add('glitch'); }   // Titel-Glitch synchron zum Blitz
        for(let h=0;h<hops;h++){ let bi=0,bd=1e18; for(let k=0;k<pool.length;k++){ const d=(pool[k].c.x-prev.x)**2+(pool[k].c.y-prev.y)**2; if(d<bd){bd=d;bi=k;} }
          const node=pool.splice(bi,1)[0]; mfxBolt(prev,node.c,col); mfxSplash(node.c.x,node.c.y,col,4+(Math.random()*4|0)); mfxFlash(node.el,'menuZap',440); prev=node.c; if(!pool.length) break; } } }
    // Dauer-Schweißglut an der UNTEREN-RECHTEN Ecke des Hangar-Buttons – stark flackernd (als würde dort geschweißt)
    mfxWeldT-=dt; const hb=document.getElementById('shopBtn');
    if(hb&&hb.offsetParent!==null){ const R=mfxRect(s,hb); mfxWeld.x=R.left+R.w-7; mfxWeld.y=R.top+R.h-7;
      if(mfxWeldT<=0){ mfxWeldT=0.02+Math.random()*0.085;
        mfxWeld.glow=(Math.random()<0.28)?(0.08+Math.random()*0.18):(0.6+Math.random()*0.4);   // erratisch hell/dunkel = starkes Flackern
        const n=1+(Math.random()<0.32?1:0)+(Math.random()<0.12?1:0);   // sputternde Schweißfunken
        for(let i=0;i<n;i++){ const ang=0.05+Math.random()*1.15, sp=55+Math.random()*150,   // nach RECHTS-UNTEN spritzen
            c=Math.random()<0.2?'#ffffff':(Math.random()<0.5?'#ffe600':'#ffd23f');   // Funken gelb (vereinzelt weiß-heiß)
          mfxSpark(mfxWeld.x,mfxWeld.y,c,Math.cos(ang)*sp,Math.sin(ang)*sp,0.15+Math.random()*0.26,1.4+Math.random()*1.5); } }
    } else mfxWeld.glow=0;
    mfxWeld.glow*=Math.pow(0.015,dt);   // schneller abklingen → snappigeres Flackern
    // ---- zeichnen (weiches additives Glühen, wie die Effekte im Spiel) ----
    const x=mfxX; x.clearRect(0,0,mfxW,mfxH); x.save(); x.globalCompositeOperation='lighter';
    for(let i=mfxBolts.length-1;i>=0;i--){ const bo=mfxBolts[i]; bo.t-=dt; if(bo.t<=0){ mfxBolts.splice(i,1); continue; }
      const a=Math.max(0,bo.t/bo.life); mfxStroke(x,bo.pts,bo.col,a, bo.branch?1.2:2.2, bo.branch?6:11); }
    x.globalAlpha=1;
    for(let i=mfxSparks.length-1;i>=0;i--){ const sp=mfxSparks[i]; sp.life-=dt; if(sp.life<=0){ mfxSparks.splice(i,1); continue; }
      sp.x+=sp.vx*dt; sp.y+=sp.vy*dt; sp.vy+=170*dt; sp.vx*=0.95; mfxDot(x,sp); }
    if(mfxWeld.glow>0.04){ const g=Math.min(1,mfxWeld.glow), wx=Math.round(mfxWeld.x), wy=Math.round(mfxWeld.y);   // weißer Schweißkern, eckig
      x.globalAlpha=0.4*g; x.fillStyle='#fff3b0'; x.fillRect(wx-7,wy-7,14,14);     // gelblich-weißer Schein
      x.globalAlpha=0.85*g; x.fillStyle='#ffffff'; x.fillRect(wx-4,wy-4,8,8);
      x.globalAlpha=g; x.fillStyle='#ffffff'; x.fillRect(wx-2,wy-2,4,4); }          // gleißend weißer Kern
    x.globalAlpha=1; x.restore();
  }

  // ---------- Ambient-Neon-Sparkle: dezente Funken über allen Untermenüs (Hauptmenü-Feeling überall) ----------
  let asCv,asX,asW=0,asH=0,asM=[]; const AS_COLS=['#19f0ff','#ff2e88','#ffe600','#b06bff','#caffff'];
  function asReset(m){ m.x=Math.random()*(asW||320); m.y=(asH||640)+6+Math.random()*40; m.vx=(Math.random()-0.5)*9; m.vy=-(7+Math.random()*16);
    m.r=1.1+Math.random()*2; m.base=0.45+Math.random()*0.5; m.ph=Math.random()*6.28; m.tw=1.3+Math.random()*2.4; m.col=AS_COLS[(Math.random()*AS_COLS.length)|0]; return m; }
  function asSpawn(){ const m=asReset({}); m.y=Math.random()*(asH||640); return m; }   // Erstbefüllung über die ganze Höhe
  function asOpen(){ return !!document.querySelector('#settings:not(.hidden),#ach:not(.hidden),#shop:not(.hidden),#shipEditor:not(.hidden),#coinshop:not(.hidden),#statusView:not(.hidden),#howto:not(.hidden),#pause:not(.hidden),#over:not(.hidden),#upgrade:not(.hidden),#arsenalView:not(.hidden)'); }
  function asFrame(dt){
    if(!asCv){ asCv=document.getElementById('fxSparkle'); if(!asCv) return; asX=asCv.getContext('2d'); }
    if(state===S.PLAY || !asOpen()){ if(asCv.style.display!=='none'){ asM.length=0; if(asX&&asW) asX.clearRect(0,0,asW,asH); asCv.style.display='none'; } return; }   // im Spiel (S.PLAY zuerst → kein querySelector pro Frame) / Hauptmenü: Canvas ganz aus dem Compositing nehmen
    if(asCv.style.display==='none') asCv.style.display='block';
    const dpr=Math.min(2,window.devicePixelRatio||1), w=window.innerWidth, h=window.innerHeight;
    if(asCv.width!==Math.round(w*dpr)||asCv.height!==Math.round(h*dpr)){ asCv.width=Math.round(w*dpr); asCv.height=Math.round(h*dpr); asW=w; asH=h; asX.setTransform(dpr,0,0,dpr,0,0); }
    while(asM.length<58) asM.push(asSpawn());
    const x=asX; x.clearRect(0,0,asW,asH); x.save(); x.globalCompositeOperation='lighter';
    for(const m of asM){ m.x+=m.vx*dt; m.y+=m.vy*dt; m.ph+=m.tw*dt;
      if(m.y<-12||m.x<-12||m.x>asW+12){ asReset(m); continue; }
      const a=m.base*(0.45+0.55*Math.sin(m.ph)), s=m.r; x.fillStyle=m.col;   // sanftes Funkeln (Twinkle)
      x.globalAlpha=a*0.34; x.fillRect(m.x-s*1.6,m.y-s*1.6,s*3.2,s*3.2);      // weicher Halo
      x.globalAlpha=a;     x.fillRect(m.x-s*0.5,m.y-s*0.5,s,s); }          // eckiger Kern (Pixel-Look wie im Spiel)
    x.globalAlpha=1; x.restore();
  }
  // ---------- Loop ----------
  function loop(now){ let dt=(now-lastT)/1000; lastT=now; if(dt>0.05)dt=0.05;
    const inst=dt*1000;                                                                            // rohe Zeit dieses Frames
    frameMs+=(inst-frameMs)*0.12;                                                                  // geglättete Frame-Zeit (EMA), etwas reaktiver
    // Erkennt die echte Bildwiederholrate selbst: vsyncMs folgt schnell der Untergrenze, driftet nur langsam hoch.
    vsyncMs+=(frameMs-vsyncMs)*(frameMs<vsyncMs?0.25:0.0008); if(vsyncMs<6) vsyncMs=6;
    // Governor: hält die native Rate (60/90/120/144 Hz), garantiert aber eine ABSOLUTE 60-FPS-Untergrenze.
    // Ziel „nie ruckeln": schnell runter (Einzel-Ruckler sofort hart), langsam wieder hoch und nur mit klarer
    // Reserve (>~70 FPS) → der Governor reitet nie auf der 60er-Kante und pumpt nicht. Erst FX-Dichte, dann Auflösung.
    const F60=16.9, spike=inst>28;                                                                 // >16.9ms ≈ <59 FPS · Einzelframe >28ms = Ruckler
    if(frameMs>vsyncMs*1.6 || frameMs>F60){ const st=spike?0.14:(frameMs>F60?0.06:0.04);
      if(fxQ>0.4) fxQ=Math.max(0.4,fxQ-st);
      else if(qScale>0.5){ qScale=Math.max(0.5,qScale-(spike?0.08:0.05)); applyScale(); } }
    else if(frameMs<vsyncMs*1.25 && frameMs<14.3){ if(qScale<1){ qScale=Math.min(1,qScale+0.03); applyScale(); } else if(fxQ<1) fxQ=Math.min(1,fxQ+0.015); }
    // CSS-Notbremse direkt an der Framerate (Hysterese): Deko/CRT-Overlay bei <~59 FPS aus, zurück erst >~74 FPS
    let lf=_lowfx; if(!_lowfx && frameMs>17.0) lf=true; else if(_lowfx && frameMs<13.5) lf=false;
    if(lf!==_lowfx){ _lowfx=lf; document.body.classList.toggle('lowfx',lf); }
    if(meta.research&&(meta.research.active||(meta.research.queue&&meta.research.queue.length))) drainResearchInstant();   // Alt-Speicherstand mit laufender Forschung → sofort gutschreiben (läuft genau einmal)
    if(state===S.PLAY){ if(coachPause) coachFreezeTick(dt); else update(dt); }
    else { elapsed=(elapsed||0)+dt; updateStars(dt);
      if(particles)for(const p of particles){if(p.life<=0)continue;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=0.94;p.vy*=0.94;p.life-=p.decay;}
      // Abgangs-FX nachlaufen lassen (update() läuft im OVER-State nicht): Feuer-Konfetti, Schockwellen, Nuklearblitz
      for(let i=gibs.length-1;i>=0;i--){ const g=gibs[i]; g.x+=g.vx*dt; g.y+=g.vy*dt; g.vy+=g.grav*dt; g.vx*=0.99; g.rot+=g.vr*dt; g.life-=dt; if(g.life<=0||g.y>H+50) gibs.splice(i,1); }
      for(let i=novas.length-1;i>=0;i--){ novas[i].t+=dt; if(novas[i].t>=novas[i].life) novas.splice(i,1); }
      deathFlash=Math.max(0,(deathFlash||0)-dt*1.5); flash=Math.max(0,(flash||0)-dt*1.5);
      if(state===S.OVER){ deathT+=dt;   // Loser-Materialisierung: nach der Explosion sammeln sich Partikel ein
        if(deathT>0.55 && !deathGather){ deathGather=true;
          for(let i=0;i<26;i++){ const a=i/26*6.28; emitP(deathX+Math.cos(a)*95,deathY+Math.sin(a)*95,-Math.cos(a)*150,-Math.sin(a)*150,0.62,i%2?deathGlow:'#caffff',rand(3,5)); }
          sfxMaterialize(); } }
      shake=Math.max(0,(shake||0)-dt*60); }
    if(achToasts.length){ achToasts[0].t-=dt; if(achToasts[0].t<=0) achToasts.shift(); }
    renderCockpit();   // DOM-Cockpit (sig-guarded, nur bei Änderung)
    renderFxbar();     // DOM-Effekt-Timer oben
    syncCoinBadge();   // persistentes Coin-Badge (oben, alle Overlay-Screens außer Hauptmenü) → Werkstatt-Shortcut
    // Funken-Layer immer animieren (auch über Pause/Hangar/Upgrade) → derselbe coole Sparkle-Hintergrund wie in den Menüs.
    asFrame(dt);
    // Bei offenem Vollbild-Overlay (Upgrade/Skill-Baum/Pause) die SPIEL-Szene einfrieren (kein draw()) → spart Render-Last; das Menü deckt sie eh ab.
    if(state===S.UPGRADE||state===S.PAUSE){ requestAnimationFrame(loop); return; }
    draw(); drawAchToast(); if(state===S.MENU) mfxFrame(dt); requestAnimationFrame(loop);
  }
  function drawAchToast(){ if(!achToasts.length) return; const a=achToasts[0], id=a.id, al=Math.min(1,a.t,3.4-a.t+0.6), research=a.kind==='research', col=research?'#19f0ff':'#ffe600';
    const w=Math.min(W*0.86,360), x=W/2-w/2, y=Math.max(54,H*0.12);
    ctx.save(); ctx.globalAlpha=Math.max(0,al);
    ctx.fillStyle='rgba(8,1,15,0.85)'; ctx.strokeStyle=col; ctx.lineWidth=2; ctx.shadowBlur=16; ctx.shadowColor=col;
    ctx.beginPath(); rr(x,y,w,52,12); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
    ctx.textAlign='left'; ctx.textBaseline='middle';
    if(research){ ctx.font='26px Space Mono, monospace'; ctx.fillStyle='#fff'; ctx.fillText('🔬',x+16,y+27);
      ctx.font='700 13px Orbitron, sans-serif'; ctx.fillStyle=col; ctx.fillText(t('researchDone'),x+52,y+16);
      ctx.font='700 15px Orbitron, sans-serif'; ctx.fillStyle='#fff'; ctx.fillText(a.name+' · Lv '+a.lvl,x+52,y+36); }
    else { ctx.font='26px Space Mono, monospace'; ctx.fillStyle='#fff'; ctx.fillText(((ACH.find(z=>z.id===id)||{}).ico)||'🏅',x+16,y+27);
      ctx.font='700 13px Orbitron, sans-serif'; ctx.fillStyle=col; ctx.fillText(t('achGot'),x+52,y+16);
      ctx.font='700 15px Orbitron, sans-serif'; ctx.fillStyle='#fff'; ctx.fillText(achName(id),x+52,y+36); }
    ctx.restore(); }

  // ---------- DOM ----------
  const scoreEl=document.getElementById('score'),comboEl=document.getElementById('combo'),bestHud=document.getElementById('best-hud'),coinHud=document.getElementById('coinHud'),
        finalScore=document.getElementById('finalScore'),finalBest=document.getElementById('finalBest'),quipEl=document.getElementById('quip'),
        newrecEl=document.getElementById('newrec'),modeNameEl=document.getElementById('modeName'),overModeEl=document.getElementById('overMode'),
        zenExitBtn=document.getElementById('zenExit'),upgradeCards=document.getElementById('upgradeCards'),upgradeSub=document.getElementById('upgradeSub'),
        titleTag=document.getElementById('titleTag'),insultEl=document.getElementById('insult'),
        pauseSub=document.getElementById('pauseSub'),
        comboBarEl=document.getElementById('comboBar'),comboFillEl=comboBarEl.querySelector('i'),
        menuChipsEl=document.getElementById('menuChips'),chipsEarnedEl=document.getElementById('chipsEarned');
  // Shop-DOM ist umlenkbar: eigener Werkstatt-Screen (Menü) ODER Werkstatt-Reiter im Arsenal
  let shopCards=document.getElementById('shopCards'), shopChipsEl=document.getElementById('shopChips'), shopHintEl=document.getElementById('shopHint'), shopTabsHostId='shopTabs', shopTick=0;
  function setShopHost(which){ if(which==='arsenal'){ shopCards=document.getElementById('arShopCards'); shopChipsEl=document.getElementById('arShopChips'); shopHintEl=document.getElementById('arShopHint'); shopTabsHostId='arShopTabs'; }
    else { shopCards=document.getElementById('shopCards'); shopChipsEl=document.getElementById('shopChips'); shopHintEl=document.getElementById('shopHint'); shopTabsHostId='shopTabs'; } }
  function updateDiffLabel(){ const e=document.getElementById('diffName'); if(e) e.textContent=(DIFFS[meta.diff||0]||DIFFS[0]).name; renderDiffInfo(); }
  function renderDiffInfo(){ const box=document.getElementById('diffInfo'); if(!box) return;
    const i=meta.diff||0, d=DIFFS[i]||DIFFS[0];
    const sg=v=>(v>0?'+':'')+v+'%';
    const spd=sg(d.spd), hp=sg(d.hp), coin=d.coin;   // glatte Tabellenwerte (decken sich 1:1 mit dem Spiel)
    let dots=''; for(let k=0;k<DIFFS.length;k++) dots+='<i class="'+(k<=i?'on':'')+'"></i>';
    box.innerHTML='<div class="diffQuip">“'+d.q+'”</div>'
      +'<div class="diffMeter" aria-label="'+t('diffRating')+'">'+t('diffRating')+' <span class="diffDots">'+dots+'</span></div>'
      +'<div class="diffStats">'
      +'<span>🏃 '+t('diffSpeed')+' <b>'+spd+'</b></span>'
      +'<span>🛡 '+t('diffArmor')+' <b>'+hp+'</b></span>'
      +'<span class="diffReward">🪙 '+t('diffCoins')+' <b>×'+coin.toFixed(2).replace(/\.?0+$/,'')+'</b></span>'
      +'</div>'; }
  { const db=document.getElementById('diffBtn'); if(db){ updateDiffLabel();
    db.addEventListener('click',()=>{ meta.diff=((meta.diff||0)+1)%DIFFS.length; saveMeta(); updateDiffLabel(); sfxPow(); vibe(8); }); }
    const dib=document.getElementById('diffInfoBtn'); if(dib) dib.addEventListener('click',()=>{ const di=document.getElementById('diffInfo'); if(di){ const open=di.classList.toggle('open'); dib.classList.toggle('on',open); } }); }
  { const pb=document.getElementById('playBtn'); if(pb) pb.addEventListener('click',()=>startGame('normal')); }   // nur ein Modus
  document.getElementById('shopBtn').addEventListener('click',()=>openArsenalView('loadout'));   // Menü → Hangar (kaufen + ausrüsten + wechseln, mit Coins)
  document.getElementById('overShopBtn').addEventListener('click',()=>openArsenalView('shop'));   // Over → der EINE Hub (Werkstatt-Tab)
  document.getElementById('shopBackBtn').addEventListener('click',closeShop);
  { coinBadgeEl=document.getElementById('coinBadge'); if(coinBadgeEl) coinBadgeEl.addEventListener('click',coinTapToShop); }   // Coin-Badge → Coinshop (Münzen holen)
  document.getElementById('shopCloseBtn').addEventListener('click',closeShop);
  // Pixel-Schiff-Editor: Buttons + Mal-Eingabe
  { const g=id=>document.getElementById(id);
    if(g('edBackBtn')) g('edBackBtn').addEventListener('click',closeShipEditor);
    if(g('edSaveBtn')) g('edSaveBtn').addEventListener('click',saveCustomShip);
    if(g('edClearBtn')) g('edClearBtn').addEventListener('click',clearCustomEdit);
    const ecv=g('editCanvas'); if(ecv){ const pp=e=>{ e.preventDefault(); const c=edCellAt(e.clientX,e.clientY); if(c) edPaint(c.ccx,c.row); };
      ecv.addEventListener('pointerdown',e=>{ edPaintActive=true; try{ecv.setPointerCapture(e.pointerId);}catch(_){} pp(e); });
      ecv.addEventListener('pointermove',e=>{ if(edPaintActive) pp(e); });
      ecv.addEventListener('pointerup',()=>{ edPaintActive=false; }); ecv.addEventListener('pointercancel',()=>{ edPaintActive=false; }); ecv.addEventListener('pointerleave',()=>{ edPaintActive=false; }); } }
  document.getElementById('achBtn').addEventListener('click',openAch);
  document.getElementById('achBackBtn').addEventListener('click',closeAch);
  document.getElementById('achCloseBtn').addEventListener('click',closeAch);
  document.getElementById('statusBtn').addEventListener('click',openStatusView);
  document.getElementById('statusBackBtn').addEventListener('click',closeStatusView);
  document.getElementById('statusCloseBtn').addEventListener('click',closeStatusView);
  document.getElementById('settingsBtn').addEventListener('click',openSettings);
  document.getElementById('settingsBackBtn').addEventListener('click',closeSettings);
  document.getElementById('settingsCloseBtn').addEventListener('click',closeSettings);
  { const sb=document.getElementById('shipBtn'); if(sb) sb.addEventListener('click',()=>{ shopTab='cosmetic'; openArsenalView('shop'); }); }   // Hauptmenü → Hub auf Werkstatt/Kosmetik (Skins + Editor)
  { const cb=document.getElementById('coinBtn'); if(cb){ cb.innerHTML='<span class="ico">'+CHEST_SVG+'</span><span class="iconLbl" id="lblCoin">'+t('il_coin')+'</span>'; cb.addEventListener('click',openCoinShop); }
    // JEDE Coin-Anzeige → Coinshop (konsistent): Guthaben-Buttons, HUD-Zähler, Menü-Coins
    ['shopChips','arShopChips','arCoin'].forEach(id=>{ const e=document.getElementById(id); if(e) e.addEventListener('click',openCoinShop); });
    { const ch=document.getElementById('coinHud'); if(ch) ch.addEventListener('click',coinTapToShop); }                                  // HUD oben links (pausiert den Run zuerst)
    { const mc=document.getElementById('menuChips'); if(mc) mc.addEventListener('click',e=>{ e.stopPropagation(); openCoinShop(); }); }   // Coins im WERKSTATT-Knopf: nur die Zahl → Coinshop (Knopf selbst → Hub)
    const ct=document.getElementById('coinTitle'); if(ct) ct.innerHTML=CHEST_SVG+' COINS';
    const cbk=document.getElementById('coinBackBtn'); if(cbk) cbk.addEventListener('click',closeCoinShop);
    const ccl=document.getElementById('coinCloseBtn'); if(ccl) ccl.addEventListener('click',closeCoinShop);
  }
  document.querySelectorAll('#optRows .optrow').forEach(row=>row.addEventListener('click',()=>cycleOpt(row.dataset.opt)));
  { const y=document.getElementById('tlmcYes'), n=document.getElementById('tlmcNo'); if(y) y.addEventListener('click',()=>answerTlm(true)); if(n) n.addEventListener('click',()=>answerTlm(false)); }
  { const ab=document.getElementById('advToggleBtn'); if(ab) ab.addEventListener('click',()=>{ const c=document.getElementById('advOpts'); if(!c) return; const open=!c.classList.toggle('advCollapsed'); ab.innerHTML=t('advOpt')+' '+(open?'▾':'▸'); beep(open?620:420,0.05,'square',0.18); }); }
  { const tx=document.getElementById('tlmExportBtn'); if(tx) tx.addEventListener('click',()=>{ exportTelemetry((n,okc)=>{ tx.textContent=(n>0?(t('tlmDone')+' ('+n+')'):t('tlmEmpty')); beep(n>0?740:330,0.06,'square',0.2); setTimeout(()=>{ tx.textContent=t('tlmExport'); },1600); }); }); }   // Telemetrie-JSON in die Zwischenablage
  document.querySelectorAll('#resetRows .optrow').forEach(b=>b.addEventListener('click',()=>armReset(b)));
  // Lautstärke-Slider (Musik/Sound): live anwenden, am Ende speichern; Slider-Geste entsperrt zugleich Audio
  { const wire=(id,key,vId,testBeep)=>{ const s=document.getElementById(id); if(!s) return;
      const upd=()=>{ opt[key]=Math.max(0,Math.min(1,(+s.value||0)/100)); unlockAudio(); applyVolumes();
        const e=document.getElementById(vId); if(e) e.textContent=Math.round(opt[key]*100)+'%'; };
      s.addEventListener('input',upd);
      s.addEventListener('change',()=>{ upd(); saveOpt(); if(testBeep&&opt[key]>0) beep(740,0.06,'square',0.2); }); };
    wire('volMusic','music','volMusicV',false); wire('volSfx','sfx','volSfxV',true); }
  document.getElementById('againBtn').addEventListener('click',()=>startGame());
  document.getElementById('menuBtn').addEventListener('click',toMenu);
  document.getElementById('continueBtn').addEventListener('click',doContinue);
  document.getElementById('giveupBtn').addEventListener('click',declineContinue);
  document.getElementById('lore').addEventListener('pointerdown',e=>{ e.preventDefault(); dismissLore(); });
  document.getElementById('shareBtn').addEventListener('click',shareScore);
  // --- Leaderboard & Nickname ---
  { const g=id=>document.getElementById(id);
    const lbBtn=g('lbBtn'); if(lbBtn) lbBtn.addEventListener('click',()=>openLeaderboard('start'));
    const lbc=g('lbCloseBtn'); if(lbc) lbc.addEventListener('click',closeLeaderboard);
    const lbb=g('lbBackBtn'); if(lbb) lbb.addEventListener('click',closeLeaderboard);
    const lsb=g('lbSubmitBest'); if(lsb) lsb.addEventListener('click',onSubmitBest);
    const ssb=g('saveScoreBtn'); if(ssb) ssb.addEventListener('click',onSaveScore);
    const ns=g('nickSaveBtn'); if(ns) ns.addEventListener('click',nickConfirm);
    const nc=g('nickCancelBtn'); if(nc) nc.addEventListener('click',nickCancel);
    const ni=g('nickInput'); if(ni) ni.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); nickConfirm(); } else if(e.key==='Escape'){ e.preventDefault(); nickCancel(); } }); }
  applyI18n(); updateMenuChips();
  { const cr=document.querySelector('.credit'); if(cr) cr.textContent='THRONERUSH '+GAME_VER; }   // Versions-Anzeige immer synchron zu GAME_VER (nie wieder stale)
  // Erst-Run-Onboarding: einmalige "So geht's"-Karte über dem Menü
  function closeHowto(){ const h=document.getElementById('howto'); if(h) h.classList.add('hidden'); meta.seen=meta.seen||{}; meta.seen.howto=1; saveMeta(); }
  { const hb=document.getElementById('howtoBtn'); if(hb) hb.addEventListener('click',()=>{ closeHowto(); beep(740,0.08,'square',0.25); startGame('normal'); }); }   // „LOS!" startet direkt einen Arcade-Run (kein Sackgassen-Menü mehr)
  if(!(meta.seen&&meta.seen.howto)){ const h=document.getElementById('howto'); if(h) h.classList.remove('hidden'); }
  // Versions-Label dynamisch aus der echten Cache-Version (kein hartkodiertes „v54" mehr)
  try{ if(window.caches&&caches.keys) caches.keys().then(ks=>{ const m=(ks.find(k=>/(?:thronerush|neondrift)-v\d+/.test(k))||'').match(/v\d+/); const el=document.querySelector('.credit'); if(el&&m) el.textContent='THRONERUSH '+m[0]; }); }catch(e){}
  zenExitBtn.addEventListener('click',pauseGame);
  document.getElementById('resumeRunBtn').addEventListener('click',menuResume);
  document.getElementById('resumeBtn').addEventListener('click',resumeGame);
  document.getElementById('pauseMenuBtn').addEventListener('click',toMenu);
  { const psb=document.getElementById('pauseSettingsBtn'); if(psb) psb.addEventListener('click',openSettings); }   // Einstellungen aus der Pause erreichbar
  const av=document.getElementById('arsenalViewBtn'); if(av) av.addEventListener('click',()=>openArsenalView('loadout'));   // ohne Wrapper landet das Klick-Event als tab-Arg → alle Sektionen versteckt
  const avc=document.getElementById('arsenalCloseBtn'); if(avc) avc.addEventListener('click',closeArsenalView);
  const avb=document.getElementById('arsenalBackBtn'); if(avb) avb.addEventListener('click',closeArsenalView);
  const avs=document.getElementById('arsenalStatusBtn'); if(avs) avs.addEventListener('click',openStatusFromArsenal);   // Arsenal → Schiffsstatus (Loadout sofort prüfen)
  const usb=document.getElementById('upgradeShopBtn'); if(usb) usb.addEventListener('click',()=>openArsenalView('shop'));   // Upgrade-Screen → Hub (Werkstatt-Tab)
  const psb=document.getElementById('pauseShopBtn'); if(psb) psb.addEventListener('click',()=>openArsenalView('shop'));   // Pause → Hub (Werkstatt-Tab)
  const ckEl=document.getElementById('cockpit'); if(ckEl) ckEl.addEventListener('click',e=>{ const u=e.target.closest('[data-ult]');
    if(u&&state===S.PLAY&&(synCharge[u.dataset.ult]||0)>=1){ fireUlt(u.dataset.ult); return; }   // volle ÜBERLADUNG → aktiver Fusions-Skill
    const el=e.target.closest('[data-tab]'); if(!el) return; openArsenalFromCockpit(el.dataset.tab||'loadout'); });
  // Sound + Vollbild sind jetzt im Options-Menü; Label bei Fullscreen-Wechsel (auch via ESC) live halten
  document.addEventListener('fullscreenchange',()=>{ if(isOpen('settings')) renderSettings(); });
  // Fullscreen schon bei der ALLERERSTEN Geste anfordern (sauberste Aktivierung; Browser drosseln Auto-Requests nach Spielstart/Exit)
  if(STANDALONE){ const fr=document.querySelector('.optrow[data-opt="fullscreen"]'); if(fr) fr.style.display='none'; }   // natives Vollbild → JS-Option ausblenden
  else { let fsTried=false; const tryFs=()=>{ if(fsTried) return; fsTried=true; document.removeEventListener('pointerdown',tryFs); if(opt.fullscreen!==false) enterFullscreen(); };
    document.addEventListener('pointerdown',tryFs,{passive:true}); }
  let lastKey='';
  const isOpen=id=>{ const e=document.getElementById(id); return e&&!e.classList.contains('hidden'); };
  window.addEventListener('keydown',e=>{ if(e.code==='Escape'){
      if(isOpen('lore')){ dismissLore(); return; }   // Story-Overlay: ESC = weiter
      if(isOpen('continue')){ return; }   // Weiterleben-Abfrage: nur per Button entscheiden
      if(isOpen('statusView')){ closeStatusView(); return; }
      if(isOpen('arsenalView')){ closeArsenalView(); return; }
      if(isOpen('shipEditor')){ closeShipEditor(); return; }
      if(isOpen('settings')){ closeSettings(); return; }
      if(isOpen('nickPrompt')){ nickCancel(); return; }
      if(isOpen('leaderboard')){ closeLeaderboard(); return; }
      if(isOpen('coinshop')){ closeCoinShop(); return; }
      if(isOpen('ach')){ closeAch(); return; }
      if(state===S.PLAY) pauseGame(); else if(state===S.PAUSE) resumeGame(); else if(state!==S.MENU) toMenu(); }
    else if((e.code==='Space'||e.code==='Enter')&&state===S.OVER){e.preventDefault();startGame();}
    else if(state===S.PLAY&&e.code.indexOf('Digit')===0){ const i=parseInt(e.code.slice(5),10)-1; if(i>=0&&i<activeSyn.length) fireUlt(activeSyn[i]); }   // Tasten 1–4 = ÜBERLADUNG der aktiven Fusionen
    if(e.key==='7'&&lastKey==='6') trigger67(); lastKey=e.key; });
  document.addEventListener('visibilitychange',()=>{ lastT=performance.now();
    if(document.hidden){
      if(state===S.PLAY) pauseGame();           // im Hintergrund nicht unbemerkt sterben
      else if(state===S.UPGRADE||state===S.PAUSE) saveRun();   // Snapshot auch aus Upgrade-/Pause-Screen sichern
      if(actx && actx.state==='running'){ try{ actx.suspend(); }catch(e){} } // Musik & SFX anhalten (auch im Browser)
    } else {
      if(actx && actx.state==='suspended'){ try{ actx.resume(); }catch(e){} }
    }
  });
  // Reload/Tab-Schließen: letzten Stand sofort sichern (pagehide ist mobil zuverlässiger als beforeunload)
  window.addEventListener('pagehide',()=>{ if(state===S.PLAY||state===S.PAUSE||state===S.UPGRADE) saveRun(); });
  window.addEventListener('beforeunload',()=>{ if(state===S.PLAY||state===S.PAUSE||state===S.UPGRADE) saveRun(); });
  setInterval(()=>{ if(state===S.MENU) titleTag.textContent=pick(P('crazy')); },3200);
  // (Menü spielt jetzt den eigenen Chill-Track NEON CHILL – keine Song-Rotation mehr im Menü)

  clearParticles(); floaters=[]; obstacles=[]; orbs=[]; powerups=[]; lasers=[]; bullets=[]; ebullets=[]; boss=null; gems=[]; sps=[]; coinz=[]; loot=[]; beams=[]; zaps=[]; novas=[]; gibs=[]; rankIdx=0;
  multiplier=1; combo=0; nearGlow=0; flash=0; shake=0; bossActive=false; elapsed=0;
  effects={slowmo:0,magnet:0,double:0,mirror:0}; mirrorOn=false; shields=0; invuln=0;
  // Reload/Browser-Aktualisierung: war ein Run aktiv, pausiert an gleicher Stelle wiederherstellen (statt Sprung ins Menü)
  try{ const snap=loadRunSnap(); if(snap) restoreRun(snap); }catch(e){ clearRun(); }
  // Erststart-Hinweis zur anonymen Statistik: nur wenn ein Endpoint konfiguriert ist, noch nie gefragt wurde und wir im Menü sind
  try{ if(TELEMETRY_URL && !opt.tlmAsked && state===S.MENU) setTimeout(showTlmConsent,600); }catch(e){}
  requestAnimationFrame(loop);
})();
