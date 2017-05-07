import os, csv, re, operator, shutil

root = os.path.dirname(__file__)
dataPath = "Data"
outputPath = "Output"
outputIndividual = "Individual Diseases"
outputJSON = "Total"


# Raw data ->
#   (parseAllFiles) Parsed into lists and joined by disease name ->
#       (sortInput) Sorted by year, week, location ->
#           (splitInput) Also split into separate folders containing location specific information


#-------------------- Constants ----------------------------------------------

replacements = {"West Nile virus disease Nonneuroinvasiv": "West Nile virus disease Nonneuroinvasive",
                "West Nile virus disease Neuroinvasiv": "West Nile virus disease Neuroinvasive",
                
                "Hepatitis viral acute by type A": "Hepatitis viral acute type A",
                "Hepatitis viral acute by type B": "Hepatitis viral acute type B",
                "Hepatitis viral acute type C Curr": "Hepatitis viral acute type C",
                "Hepatitis viral acute by type C Confirme": "Hepatitis viral acute type C",

                "Haemophilus influenzae invasive All ages all serotype": "Haemophilus influenzae invasive All ages all serotypes",

                "Ehrlichiosis and Anaplasmosis Undetermined": "Ehrlichiosis Anaplasmosis Undetermined",
                "Ehrlichiosis and Anaplasmosis Ehrlichia chaffeensis": "Ehrlichiosis Anaplasmosis Ehrlichia chaffeensis",
                "Ehrlichiosis and Anaplasmosis Anaplasma phagocytophilum": "Ehrlichiosis Anaplasmosis Anaplasma phagocytophilum",

                "Invasive Pneumococcal disease All ages": "Invasive Pneumococcal Disease All Ages",
                "Invasive Pneumococcal Disease All ages Confirmed": "Invasive Pneumococcal Disease All Ages",
                }

#-------------------- Utility functions --------------------------------------

def printAndLog(log, text):
    print(text)
    log.write(text + "\n")

#--------------------- Parsing and separating raw data files -----------------

def getTopRow(lst):
    temp = [["Area"],["Year"],["Week"]]
    for i in range(3, len(lst[0])-2, 10):
        cell = lst[0][i][:-14]
        temp.append([cell])

    return temp

def parseFile(lst, log):
    output = getTopRow(lst)

    for i in range(1, len(lst)):
        for j in range(0,3):
            output[j].append(lst[i][j])
        for k in range(3, len(lst[0])-2, 10):
            j += 1
            output[j].append(lst[i][k])

    for row in output:
        log.write("|".join(row))
        log.write("\n\n\n")

    return output

def makeFiles(data, path, years):
    for i in range(3, len(data)):
        filename = re.sub('[^0-9a-zA-Z]+', ' ', data[i][0]).rstrip()
        if filename in replacements:
            filename = replacements[filename]

        path = outputPath + '/' + filename + '.csv'
        print(path)
        
        # If the file doesn't exist, we write the header
        exists = os.path.isfile(path)

        with open(path, 'a') as f:
            if not exists:
                temp = []
                for k in range(0,3):
                    temp.append(data[k][0])
                f.write(",".join(temp)+",Counts\n")
            for  j in range(1, len(data[0])):
                f.write(data[0][j] + "," +
                        data[1][j] + "," +
                        data[2][j] + "," +
                        data[i][j] + "\n")

def parseAllFiles():
    # Reset output folder
    path = root + "/" + outputPath
    for _, _, files in os.walk(path):
        for file in files:
            os.remove(path + "/" + file)
            
    with open('Log.txt', 'w') as log:
        with open('Years.txt', 'w') as years:
            path = root + "/" + dataPath
            for _, dirs, _ in os.walk(path):
                for directory in dirs:
                    printAndLog(log, "Year: " + directory)
                    directoryPath = path + "/" + directory
                    for _, _, files in os.walk(directoryPath):
                        for file in files:
                            if file.endswith(".csv"):
                                printAndLog(log, "\t" + file)
                                with open(directoryPath + "/" + file, 'r') as f:
                                    reader = csv.reader(f)
                                    current = list(reader)
                                    parsed = parseFile(current, log)
                                    makeFiles(parsed, root, years)
                    printAndLog(log, "")

            printAndLog(log, root)  


#-------------------- Modifiying separated datasets ------------------
states = ['Alabama',        'Alaska',       'Arizona',          'Arkansas',         'California',
          'Colorado',       'Connecticut',  'Delaware',         'Florida',          'Georgia',
          'Hawaii',         'Idaho',        'Illinois',         'Indiana',          'Iowa',
          'Kansas',         'Kentucky',     'Louisiana',        'Maine',            'Maryland',
          'Massachusetts',  'Michigan',     'Minnesota',        'Mississippi',      'Missouri',
          'Montana',        'Nebraska',     'Nevada',           'New Hampshire',    'New Jersey',
          'New Mexico',     'New York',     'North Carolina',   'North Dakota',     'Ohio',    
          'Oklahoma',       'Oregon',       'Pennsylvania',     'Rhode Island',     'South Carolina',
          'South Dakota',   'Tennessee',    'Texas',            'Utah',             'Vermont',
          'Virginia',       'Washington',   'West Virginia',    'Wisconsin',        'Wyoming']

def checkState(location):
    for state in states:
        if location == state:
            return True
    return False

def letters(string):
    valids = []
    for character in string:
        if character.isalpha():
            valids.append(character)
    return ''.join(valids)

states = list(map(lambda s: letters(s.upper()), states))
            
def sortOutput():
    def isInt(s):
        try: 
            int(s)
            return True
        except ValueError:
            return False

    weeks2014 = 53
    weeks2015 = 52
    weeks2016 = 52
    
    path = root + "/" + outputPath
    for _, _, files in os.walk(path):
        for file in files:
            filePath = path + "/" + file
            
            infile = open(filePath, 'r')
            reader = csv.reader(infile, delimiter=",")
            header = next(reader)

            sortedlist = sorted(reader, key=lambda row: (int(row[1]), int(row[2])))

            weekmod = 0
            startyear = int(sortedlist[0][1])
            if startyear > 2014:
                weekmod += weeks2014
            if startyear > 2015:
                weekmod += weeks2015
            if startyear > 2016:
                weekmod += weeks2016
                
            infile.close()

            outlist = []
            weeksLastYearCumulative = 0
            previous = 0
            for row in sortedlist:
                week = int(row[2])  
                # On year wrap-around, set new weeks last year
                if week < previous:
                    weeksLastYearCumulative += previous
                if letters(row[0]).upper() in states:
                    outlist.append(row[:3] + [(weekmod + week + weeksLastYearCumulative)] + row[3:])
                previous = week

            outlist = sorted(outlist, key=lambda row: (row[0], row[3]))

            previous = ""
            for row in outlist:
                if row[0] != previous:
                    total = 0
                    previous = row[0]
                if not isInt(row[4]):
                    row[4] = 0
                total += int(row[4])
                row.append(total)

            outlist = sorted(outlist, key=lambda row: (int(row[1]), int(row[2])))

            outfile = open(filePath, 'w', newline='')
            writer = csv.writer(outfile)
            writer.writerow(header[:3] + ["Cumulative_Week"] + header[3:] + ["Cumulative_Counts"])
            writer.writerows(outlist)
            outfile.close()

def splitOutput():
    # Reset output
    pathOut = root + "/" + outputIndividual
    for _, dirs, files in os.walk(pathOut):
        for direct in dirs:
            shutil.rmtree(pathOut + "/" + direct)

    pathIn = root + "/" + outputPath
    for _, _, files in os.walk(pathIn):
        for file in files:
            with open(pathIn + "/" + file, 'r') as inFile:
                print("Separating " + file)
                pathOutDisease = pathOut + "/" + file[:-4]
                os.mkdir(pathOutDisease)
                reader = csv.reader(inFile)

                # Have sorting do the bulk of the work for us:
                # The forced list item swapping looks pretty ugly
                # but it works and is relatively clear
                header = next(reader)
                header = [header[1], header[2], header[4], header[3], "Cumulative Counts"]
                sortedlist = sorted(reader, key=lambda row: (row[0], int(row[3])))
                previous = ""
                total = 0
                for row in sortedlist:
                    if row[0] != previous:
                        outfile = open(pathOutDisease + "/" + row[0] + ".csv", 'a', newline='')
                        writer = csv.writer(outfile)
                        writer.writerow(header)
                        previous = row[0]
                        total = 0
                    try:
                       total += int(row[4])
                    except ValueError:
                        pass
                    writer.writerow([row[1], row[2], row[4], row[3], total])

'''
def stateCumulatives():
    pathOut = root + "/" + outputJSON
    pathIn  = root + "/" + outputPath
    os.mkdir(pathOut)

    states = ['Alabama',        'Alaska',       'Arizona',          'Arkansas',         'California',
              'Colorado',       'Connecticut',  'Delaware',         'Florida',          'Georgia',
              'Hawaii',         'Idaho',        'Illinois',         'Indiana',          'Iowa',
              'Kansas',         'Kentucky',     'Louisiana',        'Maine',            'Maryland',
              'Massachusetts',  'Michigan',     'Minnesota',        'Mississippi',      'Missouri',
              'Montana',        'Nebraska',     'Nevada',           'New Hampshire',    'New Jersey',
              'New Mexico',     'New York',     'North Carolina',   'North Dakota',     'Ohio',    
              'Oklahoma',       'Oregon',       'Pennsylvania',     'Rhode Island',     'South Carolina',
              'South Dakota',   'Tennessee',    'Texas',            'Utah',             'Vermont',
              'Virginia',       'Washington',   'West Virginia',    'Wisconsin',        'Wyoming']
    
    dictUSName = "United States"
    dictStatesName = "States"

    for _, _, files in os.walk(pathIn):
        for file in files:
            output = []
            
            with open(pathIn, "/" + file, 'r') as inFile:
                reader = csv.reader(inFile)
                header = next(reader)

                sortedList = sorted(reader, key=lambda row: (int(row[3]), row[0]))

                previousWeek = 0
                for row in sortedlist:
                    week = int(row[3])
                    location = row[0]
                    temp = {"Week": week, dictUSName: {}, dictStatesName: {}}
                    if location == dictUSName:
                        temp[dictUSName] = {
                    elif row[0] in states:
                        temp[dictStatesName][location] = {}

                    if week > previousWeek:
                        output.append(temp)
                        previousWeek = week                
'''

parseAllFiles()
sortOutput()
#splitOutput()



















