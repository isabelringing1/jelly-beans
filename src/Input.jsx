import { useRef, useEffect } from "react";

const Input = (props) => {
  const {
    id,
    type,
    options,
    userParams,
    setUserParams,
    onButtonClicked,
    button,
    long,
  } = props;

  var monthRef = useRef(null);
  var dayRef = useRef(null);
  var yearRef = useRef(null);
  var dropdownRef = useRef(null);
  var numberRef = useRef(null);

  useEffect(() => {
    var newUserParams = { ...userParams };
    if (id == "gender") {
      newUserParams["gender"] = options[0];
    }
    if (id == "race") {
      newUserParams["race"] = options[0];
    }
    setUserParams(newUserParams);
  }, []);

  const onlyNumbers = (e) => {
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const onClicked = (e) => {
    onButtonClicked();
  };

  const onInputChange = (e) => {
    var newUserParams = { ...userParams };
    if (id == "birth-date") {
      console.log(e.target.id, e.nativeEvent.inputTpe);
      newUserParams["month"] = monthRef.current.value;
      if (
        monthRef.current.value.length == 2 &&
        e.target.id == "month-input" &&
        e.nativeEvent.inputType == "insertText"
      ) {
        var input = document.getElementById("day-input");
        input.focus();
        input.select();
      }

      newUserParams["day"] = dayRef.current.value;
      if (
        dayRef.current.value.length == 2 &&
        e.target.id == "day-input" &&
        e.nativeEvent.inputType == "insertText"
      ) {
        var input = document.getElementById("year-input");
        input.focus();
        input.select();
      }

      newUserParams["year"] = yearRef.current.value;
    }
    if (id == "gender") {
      newUserParams["gender"] = dropdownRef.current;
    }
    if (id == "race") {
      newUserParams["race"] = dropdownRef.current;
    }
    if (id == "guess") {
      newUserParams["guess"] = numberRef.current.value;
    }

    setUserParams(newUserParams);
  };

  const getInputError = () => {
    if (type == "date") {
      return "Not a valid date.";
    }
    return "Not a valid input.";
  };

  const isInputValid = () => {
    if (type == "date") {
      return (
        dayRef.current &&
        isDateValid(
          monthRef.current.value,
          dayRef.current.value,
          yearRef.current.value
        )
      );
    }
    return true;
  };

  function isDateValid(month, day, year) {
    if (!month || !day || !year || year.length < 4) {
      return false;
    }
    var dateStr = month + "/" + day + "/" + year;
    var date = new Date(dateStr);
    if (date > new Date() || date < new Date("1/1/1900")) {
      return false;
    }
    return !isNaN(new Date(dateStr));
  }

  return (
    <div id="input-container">
      {type == "date" && (
        <div id="date-container">
          <input
            id="month-input"
            className="input"
            type="number"
            placeholder="MM"
            onChange={onInputChange}
            ref={monthRef}
            tabIndex="-1"
          />
          <input
            id="day-input"
            className="input"
            type="number"
            placeholder="DD"
            onChange={onInputChange}
            ref={dayRef}
            tabIndex="-1"
          />
          <input
            id="year-input"
            className="input long"
            type="number"
            placeholder="YYYY"
            onChange={onInputChange}
            ref={yearRef}
            tabIndex="-1"
          />
        </div>
      )}

      {type == "dropdown" && (
        <div id="dropdown-container">
          <select
            name="selectedOption"
            className="select-input"
            onChange={(e) => {
              dropdownRef.current = e.target.value;
              onInputChange(e);
            }}
            tabIndex="-1"
          >
            {options.map((option, i) => {
              return (
                <option value={option} key={"input-" + option}>
                  {option}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {type == "number" && (
        <input
          id="number-input"
          className={"input" + (long ? " longer" : "")}
          type="number"
          onChange={onInputChange}
          ref={numberRef}
          tabIndex="-1"
        />
      )}

      {!isInputValid() && <div id="input-error">{getInputError()}</div>}

      {button && (
        <div id="button-container">
          <button
            className="button"
            id="next-button"
            onClick={onClicked}
            disabled={!isInputValid()}
            tabIndex="-1"
          >
            {button}
          </button>
        </div>
      )}
    </div>
  );
};

export default Input;
