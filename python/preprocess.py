#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Data Processing for Journal Entries
# Author: Gordon Blake

import re, datetime, os, nltk, json
# import cPickle as pickle
from collections import defaultdict

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
        counts = {}
        for token in tokens:
            if token["word"] in counts:
                counts[token["word"]]["count"] += 1
            else:
                counts[token["word"]] = {"count": 1, "pos": token["pos"]}
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
        chunks = nltk.ne_chunk((nltk.pos_tag(nltk.word_tokenize(text))));
        print chunks
        return chunks        


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
        # outfile = open('parsed_entries.json', "wb") 
        # json.dump(entries, outfile, cls=EntryEncoder)

def findLongest(entries):
    curDate = None
    streak = 1
    longest = 0
    maxStreak = 0
    for entry in entries:
      if entry.getLength() > longest: longest = entry.getLength()
      if curDate != None:
        diff = entry.getTimestamp() - curDate
        if diff.days < 2:
          streak += 1
        else:
          if streak > maxStreak: maxStreak = streak
          streak = 1

      curDate = entry.getTimestamp()

    print "Longest Entry: {}\nLongest Streak: {}".format(longest, maxStreak)

def main():
    print os.getcwd()
    os.chdir("C:\Users\gblak\OneDrive\CodePractice\webdev\\vita-app\data")
    # with open("parsed_entries.p", 'rb') as f:
    #     entries = pickle.load(f)
    #     for entry in entries: print entry
    parseFile("smallTest.txt")
    # parseFile("problemChildren.txt")
    # parseFile("all-entries-2017-04-30.txt")


if __name__ == '__main__': main()