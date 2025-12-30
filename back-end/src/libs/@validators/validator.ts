export async function validatePresenceOfMandatoryParams(
  mandatoryParams: string[],
  data: any,
) {
  try {
    let missingParams = [];

    await mandatoryParams.map((mandatoryParam) => {
      if (!Object.keys(data).includes(mandatoryParam))
        missingParams.push(mandatoryParam);
    });

    if (missingParams.length)
      throw `Please provide the following mandatory fields: ${missingParams.join(' ,')}.`;

    return;
  } catch (error) {
    throw error;
  }
}

export async function validatePresenceOfValidParams(validParams, data) {
  try {
    let invalidParams = [];

    await Object.keys(data).map((param) => {
      if (!validParams.includes(param)) invalidParams.push(param);
    });

    if (invalidParams.length)
      throw `The fields ${invalidParams.join(', ')} contain invalid data. Please check and update your entries.`;

    return;
  } catch (error) {
    throw error;
  }
}
