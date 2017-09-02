import gviz_api

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


