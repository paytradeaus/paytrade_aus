import { RootState, useAppSelector } from "@/redux/store";
import React, { useEffect, useState } from "react";
import GooglePlacesAutocomplete, {
  getLatLng,
  geocodeByPlaceId,
} from "react-google-places-autocomplete";

interface GooglePlacesAutocompleteProps {
  apiKey?: string; // default: ''
  isInvalid?: boolean;
  value?: any;
  onChange?: any;
  onBlur?: any;
  disabled?: boolean;
}

const GooglePlacesInput: React.FC<GooglePlacesAutocompleteProps> = ({
  apiKey,
  value,
  onChange,
  isInvalid,
  onBlur,
  disabled = false,
}) => {
  const getTheme: any = useAppSelector(
    (state: RootState) => state?.appTheme?.currentTheme
  );

  function isLightTheme() {
    return getTheme === "light";
  }

  const GoogleContainerStyle = {
    control: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: isLightTheme() ? "#fbfcfc" : "#1c212c",
      borderColor: isLightTheme() ? "#ccc" : "#2a3042",
      height: "46px",
      border: "none",
      boxShadow: `0 0 0 1px ${isLightTheme() ? "#ccc" : "#2a3042"}`, // Border shadow
      transition: "background-color 0.2s, box-shadow 0.2s",
      outline: "none",
      borderRadius: "0.21rem",
      "&:focus": {
        outline: "none",
        boxShadow: "none",
      },
      "&:active": {
        outline: "none",
        boxShadow: "none",
      },
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      color: isLightTheme() ? "black" : "white",
      backgroundColor: state.isSelected
        ? isLightTheme()
          ? "#e6e6e6"
          : "#2a3042"
        : isLightTheme()
        ? "#fbfcfc"
        : "#1c212c",
      "&:hover": {
        backgroundColor: isLightTheme() ? "#f0f0f0" : "#2a3042",
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      zIndex: 1000,
      backgroundColor: isLightTheme() ? "#fbfcfc" : "#1c212c",
    }),
    menuList: (provided: any) => ({
      ...provided,
      maxHeight: "20vh",
      color: isLightTheme() ? "black" : "white",
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      backgroundColor: isLightTheme() ? "white" : "#1c212c",
      height: "46px",
      borderTopLeftRadius: "0.21rem",
      borderBottomLeftRadius: "0.21rem",
    }),
    container: (provided: any) => ({
      ...provided,
      height: "46px",
    }),
    input: (provided: any) => ({
      ...provided,
      height: "46px",
      color: isLightTheme() ? "black" : "white",
    }),
    singleValue: (provided: any) => ({
      ...provided,
      height: "46px",
      color: isLightTheme() ? "black" : "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
    }),
    indicatorsContainer: (provided: any) => ({
      ...provided,
      backgroundColor: isLightTheme() ? "white" : "#1c212c",
      borderTopRightRadius: "0.21rem",
      borderBottomRightRadius: "0.21rem",
    }),
  };

  const [data, setData] = useState<any>(value);

  useEffect(() => {
    setData({
      value: { description: value, place_id: value?.place_id },
      label: value || "",
    });
  }, [value]);

  const handleChange = async (newValue?: any, actionMeta?: any) => {
    setData(newValue);

    // Extract place_id from selected place
    const placeId = newValue?.value?.place_id;
    const description = newValue?.value?.description;

    // Use the place_id to get additional details
    if (placeId) {
      try {
        const results = await geocodeByPlaceId(placeId);

        // Extract additional details such as latitude, longitude, country, region, etc.
        const { lat, lng } = await getLatLng(results[0]);
        const country = results[0]?.address_components?.find((component) =>
          component.types.includes("country")
        )?.long_name;
        const region = results[0]?.address_components?.find((component) =>
          component.types.includes("administrative_area_level_1")
        )?.long_name;
        const fullAddress = description
          ? description
          : results[0]?.formatted_address;

        // Construct an object with the desired details
        const placeDetails = {
          latitude: lat,
          longitude: lng,
          place_id: placeId,
          region: region || "",
          country: country || "",
          fullAddress: fullAddress || "",
        };

        // Call the onChange callback with the constructed object
        onChange(newValue?.value?.description, placeDetails);
      } catch {}
    } else {
      // Call the onChange callback with only the description if place_id is not available
      onChange(newValue?.value?.description);
    }
  };

  return (
    <div className={"GoogleContainerStyle"}>
      <GooglePlacesAutocomplete
        apiKey={apiKey}
        selectProps={{
          styles: GoogleContainerStyle,

          noOptionsMessage: () => "No Results", // Display "No Results" when there are no suggestions
          value: data,
          onChange: handleChange,
          onBlur: onBlur,
          isDisabled: disabled,
        }}
      />
    </div>
  );
};

export default GooglePlacesInput;
