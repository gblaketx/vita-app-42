#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Data Processing for Journal Entries
# Author: Gordon Blake

import re, datetime, os, nltk, json
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from nltk.util import ngrams
# import cPickle as pickle
import pandas as pd
from collections import defaultdict, Counter

MONTH_NAMES = {
    "january" : 1,
    "february" : 2,
    "march": 3,
    "april" : 4,
    "may" : 5,
    "june" : 6,
    "july" : 7,
    "august" : 8,
    "september" : 9,
    "october" : 10,
    "november" : 11,
    "december" : 12
}
TIME_PATTERN = re.compile("(\w+), (\w+) (\d+), (\d{4}) AT ((\d+):(\d{2})) (AM|PM)")
MONTH_PATTERN = re.compile("(" + "|".join(MONTH_NAMES.keys()) + ") (20\d{2})",
    flags=re.IGNORECASE)

#TODO: Include dash in num or no?
ADDRESS_PATTERN_FULL = re.compile(
    "(?:(\d+)(?:\–\d+)? )?([^,]+), ([^,]+), ([^,]+), ([^,•]*[^\s•])( • (\d+)° (.+))?")
ADDRESS_PATTERN_STREET = re.compile("([^,]+), ([^,]+), ([^,]+), ([^,•]*[^\s•])( • (\d+)° (.+))?")
ADDRESS_PATTERN_CITY = re.compile("([^,]+), ([^,]+), ([^,•]*[^\s•])( • (\d+)° (.+))?")
# PUNCT_TOKENS = [',', '.', '(', ')', '!', '$', '%', '?', "'", '"']
PUNCT_PATTERN = re.compile(",|\.|\(|\)|!|\$|%|\?|\"|“|”")
NON_PERSONS = frozenset(["Anyway", "Had", "Lots", "Space", "How", "Molten", "Artichoke", "Afterward",
    "Beyond", "Meekly", "Country", "Tears", "Dwarf", "Hmm", "Good", "Trader", "Mi", "Creo",
    "Sal", "Elder", "Kitchen", "Forget", "Smooth", "Brie", "Church", "Lie", "Google", "Okay",
    "Yup", "Tomorrow", "Ten", "Tis", "Basically", "Habla", "Whiny", "Busy", "Brother", "Annoy",
    "Lessons", "Carols", "Econ", "Which", "Chorale", "Works", "Always", "Got", "Break", "Gorgonzola",
    "Gratitute", "Sister", "Heads", "Market", "Pretty", "Ye", "Were", "Catch", "Apples", "Steam",
    "Zion", "Cool", "Micro", "Wealthfront", "Studied", "Psych", "Juntos", "Bro", "Math", "Think",
    "Christmas", "Stanford", "Made", "Played", "Read", "Hope", "Home", "Museum", "Hopefully", "Left",
    "Ungh", "Twitter"])
# IGNORE_TOKENS = [')', '(', '.', 'a', ',', 'the', 'and', 'an', 'of', 'in', 'that', 'for',
# 'on', 'i', 'to', 'from', 'which', 'this', 'with', 'it', 'at', "n't", 'my', 'was', 'we', 'had',
# 'so', 'as', 'about', 'were', 'are', 'is', "'s"]
# LAT_PATTERN = re.compile("(\d+\.\d+)° (?:N|S), (\d+\.\d+)° (?:W|E)")
#TODO: Determine groupings based on API needs

# Module-level function so default-dict is pickleable
# def dd(): return 0

# class MonthGroup:
#     def __init__(self, month, year):
#         self.month = month
#         self.year = year
#         self.entries = {}

#     def addEntry(entry):
#         assert(isinstance(entry, Entry))
#         assert(entry.getMonth() == self.month)

#         self.entries[entry.getDay] = entry

#     def getNumEntries(self):
#         return len(self.entries)



#     def __str__(self):
#         return "{} {} : {} Entries".format(self.month, self.year, self.getNumEntries())

sid = SentimentIntensityAnalyzer()

class EntryEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Entry) or isinstance(obj, Location) or isinstance(obj, Weather):
            return obj.__dict__
        elif isinstance(obj, datetime.datetime):
            return obj.isoformat() #TODO: May need different format for mongoose Date
        return json.JSONEncoder.default(self, obj)

class Entry:
    def __init__(self, text, header, footer):
        self.timestamp = Entry.parseTimestamp(header)
        self.loc, self.weather = Entry.parseLoc(footer)
        # self.text = text #TODO: example sentences?
        self.tokens = Entry.tokenize(text)
        self.wordCounts = Entry.countWords(self.tokens)
        self.length = len(self.tokens)
        self.namedEntities = Entry.extractNamedEntities(text)
        self.sentiment = self.extractSentenceSentiment(text)
        #TODO: S
        # self.sentences = nltk.tokenize. TODO
        # Timestamp is in (weekday, M, D, Y, military time) format

    def getTimestamp(self):
        """
        Timestame is a datetime object
        """
        return self.timestamp

    def getLength(self):
        return len(self.tokens)

    def __str__(self):
        return "Timestamp: {}\Counts: {}\nLocation: {}".format(self.timestamp, self.word_counts, self.loc)

    @staticmethod
    def getMonthNum(name):
        name = name.lower()
        return MONTH_NAMES[name]

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
    def parseLoc(line):
        match = ADDRESS_PATTERN_FULL.match(line)
        weather = None
        if match: 
            if match.group(6) != None: weather = Weather(match.group(7), match.group(8))
            return Location(match), weather
        match = ADDRESS_PATTERN_STREET.match(line)
        if match: 
            if match.group(5) != None: weather = Weather(match.group(6), match.group(7))
            return Location(match, 4), weather
        match = ADDRESS_PATTERN_CITY.match(line)
        if match:
            if match.group(4) != None: weather = Weather(match.group(5), match.group(6))
            return Location(match, 3), weather

        raise RuntimeError("Footer: {} not parsing".format(line))
            #TODO: determine format based on Google Charts API
        

    @staticmethod
    def parseTimestamp(res):        
        month = Entry.getMonthNum(res.group(2))
        hour = int(res.group(6))
        if hour != 12 and res.group(8) == "PM":
            hour = int(res.group(6)) + 12            
        return datetime.datetime(int(res.group(4)), month, int(res.group(3)), hour, int(res.group(7)))

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
        # for entry in tags:
        #     print entry[0]
        #     entry[0].decode("utf-8")
        tags = [(x[0].encode("ascii", "ignore"), x[1]) for x in tags]
        chunks = nltk.ne_chunk(tags);
        # print chunks
        # in ['PERSON', 'GPE', 'ORGANIZATION']
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

# def ddWordCount(elem): #TODO: remove
#     return {"count": 1, "pos": elem[1]}

class Weather:
    def __init__(self, temp, conditions):
        self.temp = temp
        self.conditions = conditions

class Location:
    def __init__(self, match, entries = 5):
        if entries == 5:
            self.num = match.group(1) #TODO: multiple nums?
            self.street = match.group(2)
            self.city = match.group(3)
            self.region = match.group(4)
            self.country = match.group(5)
        elif entries == 4:
            self.num = None
            self.street = match.group(1)
            self.city = match.group(2)
            self.region = match.group(3)
            self.country = match.group(4)
        elif entries == 3:
            self.num = None
            self.street = None
            self.city = match.group(1)
            self.region = match.group(2)
            self.country = match.group(3)

    def getType(self):
        return self.type

    def __str__(self):
        return "Number: {}\nStreet:{}\nCity:{}\nRegion:{}\nCountry:{}".format(
            self.num, self.street, self.city, self.region, self.country)

def parseFile(name):
    with open(name, 'r') as f:
        next = f.readline()
        entries = []
        buf = ""
        curHeader = ""
        prevLine = ""
        while next != "":
            header = TIME_PATTERN.match(next)
            if header:
                if curHeader:
                    buf = buf[0:buf.find(prevLine)]
                    # print "Header: {}\nFooter: {}".format(curHeader.group(0), prevLine)
                    entries.append(Entry(buf, curHeader, prevLine))
                curHeader = header
                buf = ""
                Footer = ""
            else:
              if not MONTH_PATTERN.match(next): #Skip month stamps?
                buf = ''.join([buf, next])
                if next.strip(): prevLine = next #TODO: could track buffer index
            
            next = f.readline()

        # findLongest(entries)

        # pickle.dump(entries, outfile, -1)
        outfile = open('parsed_entries.json', "wb")
        json.dump(entries, outfile, cls=EntryEncoder)

def generateNGrams(filename):
    with open(filename, 'r') as f:
        next = f.readline()
        buffers = []
        buf = ""
        curHeader = ""
        prevLine = ""

        while next != "":
            header = TIME_PATTERN.match(next)
            if header:
                if curHeader:
                    buf = buf[0:buf.find(prevLine)]
                    buffers.append(buf)
                curHeader = header
                buf = ""
                Footer = ""
            else:
              if not MONTH_PATTERN.match(next): #Skip month stamps?
                buf = ''.join([buf, next])
                if next.strip(): prevLine = next #TODO: could track buffer index
            
            next = f.readline()    

    text = ''.join(buffers)
    tokens = nltk.word_tokenize(text.decode('utf-8'))
    #TODO: Lowercase tokens or no?
    # trigrams = generateGramsDict(tokens, 3)
    res = []
    unigrams = Counter(tokens)
    totalWords = sum(unigrams.values())
    unigrams = dict(unigrams)
    start = 0
    unigramList = []
    for word, count in unigrams.iteritems():
        end = start + float(count) / totalWords
        unigramList.append({"word": word, "range": [start, end]})
        start = end

    res.append({"name": "1-gram", "content": unigramList})
    for size in range(2, 6):
        name = "{}-gram".format(size)
        res.append({"name": name, "content": generateGramsDict(tokens, size)})
    outfile = open('ngrams.json', "wb")
    json.dump(res, outfile)

    # outfile = open('unigrams.json', "wb")
    # json.dump(unigramList, outfile)

def generateGramsDict(tokens, n):
    # Note: uncomment to laplace smooth
    # K_SIZE = 0.001 # Size of add-K smoothing factor
    grams = ngrams(tokens, n)
    grams = dict(Counter(grams))
    res = defaultdict(lambda: [])
    for gram, count in grams.iteritems():
        key = ' '.join(gram[0:n-1])
        res[key].append({"word": gram[n-1], "range": count})
    # K_smooth = K_SIZE * len(grams)

    for _, endList in res.iteritems():
        # Note: Uncomment to Laplace Smooth
        #endList.append({"word": "<*>", "range": K_smooth}) #TODO: Better wildcard char?
        # WE don't add K to entries because the wildcard is a uniform random draw from all grams
        total = sum(map(lambda x: x["range"], endList))
        start = 0
        for item in endList:
            end = start + float(item["range"]) / total
            item["range"] = [start, end] #Note this range is open on top end [start, end)
            start = end
    
    return res

def processHealthData(filename):
    output = []
    healthData = pd.read_csv(filename)
    for _, row in healthData.iterrows():
        item = dict(row)
        item["distance"] = round(item["distance"], 2)
        item["date"] = datetime.datetime.strptime(row["date"], "%m/%d/%y")
        output.append(item)
    outfile = open("health.json", "wb")
    json.dump(output, outfile, cls=EntryEncoder)

def main():
    print os.getcwd()
    os.chdir("C:\Users\gblak\OneDrive\CodePractice\webdev\\vita-app\data")
    # with open("parsed_entries.p", 'rb') as f:
    #     entries = pickle.load(f)
    #     for entry in entries: print entry
    # parseFile("problemChildren.txt")
    # parseFile("all-entries-2017-04-30.txt")
    # generateNGrams("smallTest.txt")
    # generateNGrams("all-entries-2017-04-30.txt")
    processHealthData("Health Data.csv")

if __name__ == '__main__': main()