MMScreen9
=========

Screen9-spelare för MittMedias sajter, implementerad med SASS och Coffeescript. Observera att denna spelare är en ny implementation av spelaren och är ännu inte testad på någon sajt live.

Föregående version av spelaren (byggd i JavaScript) finns att beskåda live på MittMedias sajter:

* http://gd.se/tv
* http://arbetarbladet.se/tv
* http://helahalsingland.se/tv
* http://dt.se/webbtv
* http://st.nu/webbtv
* http://allehanda.se/tv

Samt hos våra vänner på Promedia:

* http://na.se/tv
* http://vlt.se/tv


Installation
------------

* Installera coffeescript
* Installera SASS
* Klona detta git-repo: `git clone git@github.com:mittmedia/mmscreen9.git`

Anpassning
----------

För att anpassa spelaren för ny sajt:

* Kör bygg-scriptet `cake watch` för att övervaka Coffeescripten och SASS-koden och generera JavaScript och CSS.
* Se `index.html` för källkod som ska kopieras till ny sajt.
* Katalogen `lib` innehåller tredjepartskod som krävs för att denna implementation ska fungera (dependencies).

Funktionalitet
--------------

Ett axplock av spelarens funktionalitet:

* Konfigurerbar ratio, HTML-struktur, tagg-filtrering, antal klipp per sida och rad.
* Kan visa "Alla klipp" per default eller angiven kategori
* Hämtar endast listor på klipp en gång, efterföljande visningar av listor cachas för snabb återvisning 

Om spelaren
-----------

Synpunkter, önskemål, frågor besvaras av skapare/förvaltare: Tomas Jogin (tomas.jogin@mittmedia.se)

