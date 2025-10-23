# BuyerInfo Component

## Description
The BuyerInfo component displays the current user's information from the database, including personal details and user role.

## Features
- Displays user's full name, email, phone, and role
- Shows role with appropriate styling (admin/client)
- Handles cases where user data is not available
- Responsive design

## Props
- `className` (string, optional): Additional CSS classes

## Usage
```jsx
import BuyerInfo from '../components/BuyerInfo/BuyerInfo';

const MyComponent = () => {
  return (
    <BuyerInfo className="my-custom-class" />
  );
};
```

## Data Source
The component gets user data from the userStore, which is populated when the user logs in.

## Dependencies
- React
- useUserStore (for user data)


























