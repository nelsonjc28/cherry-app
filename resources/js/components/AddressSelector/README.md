# AddressSelector Component

## Description
The AddressSelector component provides a dropdown interface for users to select their registered addresses from the database, with an option to add new addresses.

## Features
- Fetches user addresses from the API
- Displays addresses in a dropdown format
- Shows selected address details
- Includes "Add new address" button that navigates to the address management page
- Handles loading, error, and empty states
- Responsive design

## Props
- `selectedAddressId` (number, optional): ID of the currently selected address
- `onAddressChange` (function, required): Callback function called when address selection changes
- `showAddButton` (boolean, optional): Whether to show the "Add new address" button (default: true)
- `className` (string, optional): Additional CSS classes

## Usage
```jsx
import AddressSelector from '../components/AddressSelector/AddressSelector';

const MyComponent = () => {
  const [selectedAddress, setSelectedAddress] = useState(null);

  const handleAddressChange = (address) => {
    setSelectedAddress(address);
  };

  return (
    <AddressSelector
      selectedAddressId={selectedAddress?.id}
      onAddressChange={handleAddressChange}
      showAddButton={true}
      className="my-custom-class"
    />
  );
};
```

## API Integration
The component automatically fetches addresses from `/api/addresses` endpoint using the user's authentication token from the userStore.

## Dependencies
- React
- useUserStore (for authentication)
- api (axios instance)
- CustomButton component
- CherryButton component








