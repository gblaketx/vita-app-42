#!/usr/bin/env python
# -*- coding: utf-8 -*-


"""
Import command
mongoimport --db vitaDB --collection familyEntries --jsonArray 
< C:\Users\gblak\OneDrive\CodePractice\webdev\vita-app\data\parsed_family_entries.json

Fixing the date
db.getCollection('familyEntries').find().forEach(function(entry) {
    entry.timestamp = new Date(entry.timestamp);
    db.getCollection('familyEntries').save(entry);
});
"""

# Data Processing for Family Journal Entries from Evernote .enex files to MongoDB importable JSON
# Author: Gordon Blake

import re, os, nltk, json, datetime
import pandas as pd
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk.util import ngrams
from collections import defaultdict, Counter
from lxml import etree
from StringIO import StringIO

AUTHOR_PAT = re.compile("\s*(Gordon|Kent|Mom|Dad)\s*", re.IGNORECASE)
PUNCT_PATTERN = re.compile(",|\.|\(|\)|!|\$|%|\?|\"|“|”")
NON_PERSONS = frozenset(["Anyway", "Had", "Lots", "Space", "How", "Molten", "Artichoke", "Afterward",
    "Beyond", "Meekly", "Country", "Tears", "Dwarf", "Hmm", "Good", "Trader", "Mi", "Creo",
    "Sal", "Elder", "Kitchen", "Forget", "Smooth", "Brie", "Church", "Lie", "Google", "Okay",
    "Yup", "Tomorrow", "Ten", "Tis", "Basically", "Habla", "Whiny", "Busy", "Brother", "Annoy",
    "Lessons", "Carols", "Econ", "Which", "Chorale", "Works", "Always", "Got", "Break", "Gorgonzola",
    "Gratitute", "Sister", "Heads", "Market", "Pretty", "Ye", "Were", "Catch", "Apples", "Steam",
    "Zion", "Cool", "Micro", "Wealthfront", "Studied", "Psych", "Juntos", "Bro", "Math", "Think",
    "Christmas", "Stanford", "Made", "Played", "Read", "Hope", "Home", "Museum", "Hopefully", "Left",
    "Ungh", "Twitter", "Smallest"])

class EntryEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Entry):
            return obj.__dict__
        elif isinstance(obj, datetime.datetime):
            return obj.isoformat() #TODO: May need different format for mongoose Date
        return json.JSONEncoder.default(self, obj)

class Entry:
    def __init__(self, timestamp, text, author=""):
        self.timestamp = Entry.parseTimestamp(timestamp)
        self.tokens = Entry.tokenize(text)
        self.wordCounts = Entry.countWords(self.tokens)
        self.length = len(self.tokens)
        self.namedEntities = Entry.extractNamedEntities(text)
        self.sentiment = self.extractSentenceSentiment(text)

        mat = AUTHOR_PAT.match(author)
        if mat is None:
            author = ""
        else:
            author = mat.group(1).title()
        self.author = author


    def getTimestamp(self):
        """
        Timestame is a datetime object
        """
        return self.timestamp

    def getLength(self):
        return len(self.tokens)

    def __str__(self):
        return "Timestamp: {}\Counts: {}\n".format(self.timestamp, self.wordCounts)

    @staticmethod
    def countWords(tokens):
        """
            Word attributes are:
                count: Number of times word appears in entry
                pos: part of speech of word
                sentiment: number of sentences with the word with pos, neutral, and neg
                    sentiment in the entry
        """

        counts = {}
        for token in tokens:
            word = PUNCT_PATTERN.sub("", token["word"])
            if len(word) == 0: continue
            if word in counts:
                counts[word]["count"] += 1
            else:
                counts[word] = {"count": 1, 
                "pos": token["pos"], "sentiment": {"pos": 0, "neu": 0, "neg": 0}}
        return counts

    @staticmethod
    def tokenize(text):
        text = text.strip().lower()
        tokens = nltk.word_tokenize(text.decode("utf-8"))
        tokens = nltk.pos_tag(tokens)
        tokens = [{"word": x[0], "pos": x[1]} for x in tokens]
        return tokens

    @staticmethod
    def extractNamedEntities(text):
        tags = nltk.pos_tag(nltk.word_tokenize(text.decode("utf-8")))
        tags = [(x[0].encode("ascii", "ignore"), x[1]) for x in tags]
        chunks = nltk.ne_chunk(tags);
        people = set()
        for i in chunks.subtrees(filter = lambda x: x.label() == 'PERSON'):
            if(i[0][0] in NON_PERSONS): continue
            people.add(i[0][0])
        return list(people)   

    def extractSentenceSentiment(self, text):
        sentences = nltk.sent_tokenize(text.decode("utf-8"))
        entrySentiment = {"pos": 0, "neu": 0, "neg": 0, "score": 0}
        for sentence in sentences:
            scores = sid.polarity_scores(sentence)
            tokens = nltk.word_tokenize(sentence.strip().lower())


            entrySentiment["score"] += scores["compound"]
            if scores["compound"] > 0:
                sentiment = "pos"
            elif scores["compound"] < 0: 
                sentiment = "neg"
            else:
                sentiment = "neu"

            entrySentiment[sentiment] += 1

            for word in tokens:
                if word in self.wordCounts:
                    self.wordCounts[word]["sentiment"][sentiment] += 1

        return entrySentiment

    @staticmethod
    def parseTimestamp(timestamp):
        return datetime.datetime(int(timestamp[:4]), int(timestamp[4:6]), int(timestamp[6:8]))

#### Citation:
# Adapted from https://gist.github.com/xiaoganghan/3186646
sid = SentimentIntensityAnalyzer()
p = etree.XMLParser(remove_blank_text=True, resolve_entities=False)

def parseNoteXML(xmlFile):
    context = etree.iterparse(xmlFile, encoding='utf-8', strip_cdata=False, huge_tree=True)
    note_dict = {"content": {}}
    entries = []
    curAuthor = ""
    for ind, (action, elem) in enumerate(context):
        text = elem.text
        if elem.tag == 'content':
            text = []
            r = etree.parse(StringIO(elem.text.encode('utf-8')), p)
            for e in r.iter():
                    # if not curAuthor is None:
                    #     textStr = ''.join(text).encode('utf-8')
                    #     entry = Entry(note_dict["created"], textStr, curAuthor = curAuthor)
                    #     entries.append(entry)

                # try:
                if e.tag == "h1": # curAuthor-specific text
                    if len(curAuthor) > 0: note_dict["content"][curAuthor] = text
                    if not e.text is None: curAuthor = e.text
                    text = []

                elif e.text is None: 
                    text.append('\n')
                else:
                    text.append(e.text)
                # except err:
                #     print 'cannot print: {}'.format(err)
        
        if elem.tag == "content":
            note_dict[elem.tag][curAuthor] = text
        else:
            note_dict[elem.tag] = text
        
        if elem.tag == "note":
            for author in note_dict["content"]:
                textStr = ''.join(note_dict["content"][author]).encode('utf-8')
                textStr = textStr.replace("&nbsp;", " ") # Replace non-breaking space tags with regular spaces
                entry = Entry(note_dict["created"], textStr, author)
                entries.append(entry)
            # if len(note_dict["content"]) == 0:
            #     print "No authors found"
            #     print "Res text: " + text
            #     entry = Entry(note_dict["created"], text)
            #     entries.append(entry)
            curAuthor = ""
            note_dict = {"content": {}}

    return entries
### End Citation

#os.chdir("C:/Users/gblak/OneDrive/CodePractice/webdev/vita-app/data")

def main():
    # Full parse
    os.chdir("C:\Users\gblak\Documents\EvernoteBackup")
    entries = parseNoteXML("FamilyJournal_12_17_17.enex")
    entries = sorted(entries, key=lambda entry: entry.timestamp)
    outfile = open('parsed_family_entries.json', "wb")
    json.dump(entries, outfile, cls=EntryEncoder)

    #Single test file
    # os.chdir("C:/Users/gblak/OneDrive/CodePractice/webdev/vita-app/data")
    # entries = parseNoteXML("oneNote-10-22-17.enex")
    # entries = parseNoteXML("problemChild-4-2-17.enex")
    # for entry in entries:
    #     print "\nAuthor: "  + entry.author
    #     print "Timestamp: {}".format(entry.timestamp)
    #     print "First words: ",
    #     for token in entry.tokens[:40]:
    #         print token["word"] + " ",
    #     print ""

    # Load and sort
    # entries = json.load(open("C:/Users/gblak/OneDrive/CodePractice/webdev/vita-app/data/parsed_family_entries.json",
    #     , "rb"))

if __name__ == '__main__': main()