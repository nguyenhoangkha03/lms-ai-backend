const errors = [
  {
    property: 'email',
    constraints: {
      isEmail: 'Please provide a valid email address',
      isNotEmpty: 'Email is required',
    },
    children: [],
  },
  {
    property: 'profile',
    constraints: undefined,
    children: [
      {
        property: 'age',
        constraints: {
          min: 'age must be at least 18',
        },
        children: [],
      },
    ],
  },
];
function formatErrors(errors: any[]) {
  const result = errors.reduce((acc, error) => {
    const property = error.property;
    const constraints = error.constraints;

    if (!constraints) {
      acc[property] = '';
    } else {
      acc[property] = Object.values(constraints!);
    }

    if (error.children && error.children.length > 0) {
      acc[property] = formatErrors(error.children);
    }

    return acc;
  }, {});

  return result;
}

console.log(formatErrors(errors));
