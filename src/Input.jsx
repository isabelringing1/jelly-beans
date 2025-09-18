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
  } = props;

  var monthRef = useRef(null);
  var dayRef = useRef(null);
  var yearRef = useRef(null);
  var dropdownRef = useRef(null);

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
      newUserParams["day"] = dayRef.current.value;
      newUserParams["month"] = monthRef.current.value;
      newUserParams["year"] = yearRef.current.value;
    }
    if (id == "gender") {
      newUserParams["gender"] = dropdownRef.current;
    }
    if (id == "race") {
      newUserParams["race"] = dropdownRef.current;
    }

    setUserParams(newUserParams);
  };

  const getInputError = () => {
    if (isInputValid()) {
      return " ";
    } else if (type == "date") {
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
          />
          <input
            id="day-input"
            className="input"
            type="number"
            placeholder="DD"
            onChange={onInputChange}
            ref={dayRef}
          />
          <input
            id="year-input"
            className="input long"
            type="number"
            placeholder="YYYY"
            onChange={onInputChange}
            ref={yearRef}
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

      <div id="input-error">{getInputError()}</div>

      {button && (
        <div id="button-container">
          <button
            className="button"
            id="next-button"
            onClick={onClicked}
            disabled={!isInputValid()}
          >
            {button}
          </button>
        </div>
      )}
    </div>
  );
};

export default Input;
