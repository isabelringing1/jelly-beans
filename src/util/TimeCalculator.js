import { parse } from "@vanillaes/csv";
var lifeTableDict;

const DemographicIndex = {
  TOTAL: 0,
  TOTAL_MALE: 1,
  TOTAL_FEMALE: 2,
  HISPANIC_TOTAL: 3,
  HISPANIC_MALE: 4,
  HISPANIC_FEMALE: 5,
  NATIVE_TOTAL: 6,
  NATIVE_MALE: 7,
  NATIVE_FEMALE: 8,
  ASIAN_TOTAL: 9,
  ASIAN_MALE: 10,
  ASIAN_FEMALE: 11,
  BLACK_TOTAL: 12,
  BLACK_MALE: 13,
  BLACK_FEMALE: 14,
  WHITE_TOTAL: 15,
  WHITE_MALE: 16,
  WHITE_FEMALE: 17,
};

function initializeLifeTables(csv) {
  lifeTableDict = {};
  const parsed = parse(csv);
  for (var i = 1; i < parsed.length; i++) {
    lifeTableDict[parsed[i][0]] = parsed[i]
      .slice(1)
      .map((str) => parseFloat(str));
  }
  return lifeTableDict;
}

function getDaysLeft(parameters) {
  var now = new Date(); // current date
  var birth = new Date(
    parameters.month + "/" + parameters.day + "/" + parameters.year
  );

  var ageDate = new Date(now - birth); // converts from ms
  var age = Math.abs(ageDate.getUTCFullYear() - 1970);

  if (age < 0) {
    age = 0;
  } else if (age > 100) {
    age = 100;
  }
  var lifeExpectancies = lifeTableDict[age];
  var index = getDemographicIndex(parameters);
  return Math.floor(lifeExpectancies[index] * 365.25);
}

function getDemographicIndex(params) {
  var gender = 0;
  if (!params.gender || params.gender == "Male") {
    gender = -1;
  } else if (params.gender == "Female") {
    gender = 1;
  }

  if (params.race == "Hispanic") {
    if (gender == -1) {
      return DemographicIndex.HISPANIC_MALE;
    } else if (gender == 1) {
      return DemographicIndex.HISPANIC_FEMALE;
    }
    return DemographicIndex.HISPANIC_TOTAL;
  } else if (params.race == "Asian") {
    if (gender == -1) {
      return DemographicIndex.ASIAN_MALE;
    } else if (gender == 1) {
      return DemographicIndex.ASIAN_FEMALE;
    }
    return DemographicIndex.ASIAN_TOTAL;
  } else if (params.race == "Black") {
    if (gender == -1) {
      return DemographicIndex.BLACK_MALE;
    } else if (gender == 1) {
      return DemographicIndex.BLACK_FEMALE;
    }
    return DemographicIndex.BLACK_TOTAL;
  } else if (params.race == "White") {
    if (gender == -1) {
      return DemographicIndex.WHITE_MALE;
    } else if (gender == 1) {
      return DemographicIndex.WHITE_FEMALE;
    }
    return DemographicIndex.WHITE_TOTAL;
  } else {
    if (gender == -1) {
      return DemographicIndex.TOTAL_MALE;
    } else if (gender == 1) {
      return DemographicIndex.TOTAL_FEMALE;
    }
    return DemographicIndex.TOTAL;
  }
}

export { initializeLifeTables, getDaysLeft };
