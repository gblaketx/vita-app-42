import gviz_api
import sys, json

class EntryGrapher:
  def __init__(self):
    self.entries = None
    self.startDate = None #Always works within constraints of start/end date
    self.endDate = None

  def load(filename):
    """
    File assumed to be pickled sorted list of Entry objects
    """
    with open(filename, 'rb') as f:
      self.entries = pickle.load()
      self.startDate = entries[0].getTimestamp()
      self.endDate = entries[len(entries) - 1].getTimestamp()
    #TODO: catch errors

  def graphLengthOverTime(self):
    description = {"date" : ("datetime", "Date"),
                  "length" : ("int", "Entry Length")}
    data = []
    for entry in self.entries:
      elem = {}
      elem["date"] = entry.getTimestamp()
      elem["length"] = elem.getLength()
      data.append(elem)
    dataTable = gviz_api.DataTable(description)
    dataTable.LoadData(data)

    #TODO: TO JSON or JSON response?
    print "Content-type: text/plain"
    print
    print dataTable.ToJSonResponse(columns_order=("date", "length"), order_by="date")

  def getSummaryStats(self):
    curDate = None
    streak = 1
    longest = 0
    maxStreak = 0
    for entry in entries:
      if entry.getLength() > longest: longest = entry.getLength()
      if curDate != None:
        diff = entry.getTimestamp() - diff
        if diff.days < 2:
          streak += 1
        else:
          if streak > maxStreak: maxStreak = streak
          streak = 1

      curDate = entry.getTimestamp()


    return {"nEntries": len(self.entries), "lenStreak": maxStreak, "longestEntry" : longest}


