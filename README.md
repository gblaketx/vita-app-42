# [Vita - Journal Insights]

Vita is a textual analysis web application built to generate insight into a corpus of journal entries. It includes a dashboard with summary statistics, such as entry frequency, length, location, and streaks, as well as sentiment, named entities, and frequent words. It also has the ability to search for specific words to see how they are used in the corpus with word trees and occurances over time. It allows the user to generate text from phrases in the corpus with the n-gram generator. Finally, it imports and relates additional information (such as walking distance) that may relate to attributes of the journal entries.

Vita was built from the SB Admin bootstrap template, with Google Charts and Charts.JS providing the visualizations.
The application was implemented using the MEAN stack (MongoDB, Express, AngularJS, and NodeJS). The text was parsed with Python scripts, using NLTK to tokenize words, identify parts of speech and named entities, as well as to classify sentiment. The results were imported into a MongoDB database that is queried by the server.

## Copyright and License

Built from [SB Admin](http://startbootstrap.com/template-overviews/sb-admin/), an open source, admin dashboard template for [Bootstrap](http://getbootstrap.com/) created by [Start Bootstrap](http://startbootstrap.com/).
Copyright 2013-2017 Blackrock Digital LLC. Code released under the [MIT](https://github.com/BlackrockDigital/startbootstrap-sb-admin/blob/gh-pages/LICENSE) license.
