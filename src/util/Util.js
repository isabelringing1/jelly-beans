import { parse } from "@vanillaes/csv";

async function loadLifeTables(csv) {
  var dict = {};
  const parsed = parse(csv);
  for (var i = 1; i < parsed.length; i++) {
    dict[parsed[i][0]] = parsed[i].slice(1).map((str) => parseFloat(str));
  }
  console.log(dict);
  return dict;
}

export { loadLifeTables };
