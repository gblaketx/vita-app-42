#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Data Processing for Journal Entries
# Author: Gordon Blake

import re, datetime, os, nltk
import cPickle as pickle
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
LAT_PATTERN = re.compile("(\d+\.\d+)° (?:N|S), (\d+\.\d+)° (?:W|E)")
#TODO: Determine groupings based on API needs

# Module-level function so default-dict is pickleable
def dd(): return 0

class MonthGroup:
    def __init__(self, month, year):
        self.month = month
        self.year = year
        self.entries = {}

    def addEntry(entry):
        assert(isInstanceOf(entry, "Entry"))
        assert(entry.getMonth() == self.month)

        self.entries[entry.getDay] = entry

    def getNumEntries(self):
        return len(self.entries)

    @staticmethod
    def getMonthNum(name):
        name = name.lower()
        return MONTH_NAMES[name]

    def __str__(self):
        return "{} {} : {} Entries".format(self.month, self.year, self.getNumEntries())


class Entry:
    def __init__(self, text, header, footer):
        self.timestamp = Entry.parseTimestamp(header)
        self.loc = Entry.parseLoc(footer)
        self.text = text
        self.tokens = nltk.word_tokenize(text.decode("utf-8"))
        self.word_counts = Entry.countWords(self.tokens)
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
    def countWords(tokens):
        counts = defaultdict(dd)
        for token in tokens:
            counts[token.lower()] += 1
        return counts

    @staticmethod
    def parseLoc(line):
        addr = ADDRESS_PATTERN_FULL.match(line)
        if addr: return Location("addr", addr)
        addr = ADDRESS_PATTERN_STREET.match(line)
        if addr: return Location("addr", addr, 4)
        addr = ADDRESS_PATTERN_CITY.match(line)
        if addr: return Location("addr", addr, 3)

        lat = LAT_PATTERN.match(line)
        if lat: return Location("lat", lat)
        raise RuntimeError("Footer: {} not parsing".format(line))
            #TODO: determine format based on Google Charts API
        

    @staticmethod
    def parseTimestamp(res):        
        month = MonthGroup.getMonthNum(res.group(2))
        hour = int(res.group(6))
        if hour != 12 and res.group(8) == "PM":
            hour = int(res.group(6)) + 12            
        return datetime.datetime(int(res.group(4)), month, int(res.group(3)), hour, int(res.group(7)))

class Location:
    def __init__(self, type, match, entries = 5):
        self.type = type
        if type == "addr":
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
                self.city = match.group(3)
                self.region = match.group(4)
                self.country = match.group(5)
        elif type == "lat": #TODO: need n/s e/w?
            self.lat = match.group(1)
            self.long = match.group(2)
        else:
            raise ValueError("Unrecognized Type")

    def getType(self):
        return self.type

    #TODO: define getters appropriate for google charts API

    def __str__(self):
        if self.type == "addr":
            return "Number: {}\nStreet:{}\nCity:{}\nRegion:{}\nCountry:{}".format(
                self.num, self.street, self.city, self.region, self.country)
        else:
            return "Coordinates: {} °, {}°".format(self.lat, self.long)

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
                    print entries[len(entries) - 1]
                curHeader = header
                buf = ""
                Footer = ""
            else:
              if not MONTH_PATTERN.match(next): #Skip month stamps?
                buf = ''.join([buf, next])
                if next.strip(): prevLine = next #TODO: could track buffer index
            
            next = f.readline()

        print "Entries: {}".format(len(entries))
        outfile = open('parsed_entries.pickle', "wb")
        pickle.dump(entries, outfile, -1)

def main():
    print os.getcwd()
    os.chdir("C:\Users\gblak\OneDrive\CodePractice\webdev\\vita-app\data")
    # with open("parsed_entries.p", 'rb') as f:
    #     entries = pickle.load(f)
    #     for entry in entries: print entry
    parseFile("smallTest.txt")
    # parseFile("all-entries-2017-04-30.txt")


if __name__ == '__main__': main()