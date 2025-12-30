import React, { useEffect, useState } from "react";
import GooglePlacesAutocomplete, {
  getLatLng,
  geocodeByPlaceId,
} from "react-google-places-autocomplete";
import styles from "../phoneNumberInput/phoneNumberInput.module.scss";
import { XCircle } from "react-bootstrap-icons";

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
  const [data, setData] = useState<any>(value);
  useEffect(() => {
    setData({
      value: { description: value, place_id: value?.place_id },
      label: value || "",
    });
  }, []);

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
      } catch (error) {
        console.error("Error fetching place details:", error);
      }
    } else {
      // Call the onChange callback with only the description if place_id is not available
      onChange(newValue?.value?.description);
    }
  };

  return (
    <div className={styles.PhoneContainerStyle}>
      <GooglePlacesAutocomplete
        apiKey={apiKey}
        selectProps={{
          // placeholder: "Search location",
          noOptionsMessage: () => "No Results", // Display "No Results" when there are no suggestions
          value: data,
          onChange: handleChange,
          onBlur: onBlur,
          styles: {
            valueContainer: (provided) => ({
              ...provided,
              backgroundColor: isInvalid ? "#ffe6e6" : "inherit",
              borderRadius: "3px",
              // Apply background color conditionally
            }),
            control: (provided) => ({
              ...provided,
              borderColor: isInvalid ? "#f08e8b" : "lightgray",
              // Apply background color conditionally
              "&:focus": {
                borderColor: isInvalid ? "#f08e8b" : "lightgray",
                boxShadow: "0 0 0 0.25rem rgba(13, 110, 253, 0.25) !important",
              },
              "&:hover": {
                borderColor: isInvalid ? "#f08e8b" : "lightgray",
              },
              background: disabled ? "#e9ecef" : "",
            }),
            indicatorSeparator: (provided) => ({
              ...provided,
              marginTop: 0,
              marginBottom: 0,
              // Apply background color conditionally
            }),
          },
          isDisabled: disabled,
        }}
      />
      {isInvalid && (
        <XCircle
          className={styles.crossiconsAddressSyles}
          onClick={() => {
            onChange(""); // Clear the name field on icon click if desired
            setData("");
          }}
        />
      )}
    </div>
  );
};

export default GooglePlacesInput;
