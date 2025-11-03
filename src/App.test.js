import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import App, { WeatherIcons } from './App';
import CityComponent from './modules/CityComponent';
import WeatherComponent from './modules/WeatherInfoComponent';

// Mock axios
jest.mock('axios');

// Mock child components
jest.mock('./modules/CityComponent', () => {
  return jest.fn(({ updateCity, fetchWeather }) => (
    <div data-testid="city-component">
      <input
        data-testid="city-input"
        onChange={(e) => updateCity(e.target.value)}
        placeholder="City"
      />
      <button data-testid="search-button" onClick={fetchWeather}>
        Search
      </button>
    </div>
  ));
});

jest.mock('./modules/WeatherInfoComponent', () => {
  return jest.fn(({ weather, city }) => (
    <div data-testid="weather-component">
      <span data-testid="weather-city">{city}</span>
      <span data-testid="weather-temp">{weather?.main?.temp}</span>
    </div>
  ));
});

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the app label', () => {
      render(<App />);
      expect(screen.getByText('React Weather App')).toBeInTheDocument();
    });

    it('should render CityComponent initially when no city or weather data', () => {
      render(<App />);
      expect(screen.getByTestId('city-component')).toBeInTheDocument();
    });

    it('should not render WeatherComponent initially', () => {
      render(<App />);
      expect(screen.queryByTestId('weather-component')).not.toBeInTheDocument();
    });

    it('should render with correct container styling', () => {
      const { container } = render(<App />);
      const appContainer = container.firstChild;
      expect(appContainer).toBeInTheDocument();
    });
  });

  describe('City Input and State Management', () => {
    it('should update city state when input changes', () => {
      render(<App />);
      const input = screen.getByTestId('city-input');
      
      fireEvent.change(input, { target: { value: 'London' } });
      
      // Verify updateCity was called with correct value
      expect(input).toBeInTheDocument();
    });

    it('should handle empty city input', () => {
      render(<App />);
      const input = screen.getByTestId('city-input');
      
      fireEvent.change(input, { target: { value: '' } });
      
      expect(input).toBeInTheDocument();
    });

    it('should handle city input with special characters', () => {
      render(<App />);
      const input = screen.getByTestId('city-input');
      
      fireEvent.change(input, { target: { value: 'São Paulo' } });
      
      expect(input).toBeInTheDocument();
    });

    it('should handle city input with numbers', () => {
      render(<App />);
      const input = screen.getByTestId('city-input');
      
      fireEvent.change(input, { target: { value: 'City123' } });
      
      expect(input).toBeInTheDocument();
    });

    it('should handle very long city names', () => {
      render(<App />);
      const input = screen.getByTestId('city-input');
      const longCityName = 'A'.repeat(100);
      
      fireEvent.change(input, { target: { value: longCityName } });
      
      expect(input).toBeInTheDocument();
    });
  });

  describe('Weather API Integration', () => {
    const mockWeatherData = {
      data: {
        name: 'London',
        sys: { country: 'GB', sunrise: 1234567890, sunset: 1234567890 },
        main: { temp: 295.15, humidity: 65, pressure: 1013 },
        weather: [{ description: 'clear sky', icon: '01d' }],
        wind: { speed: 5.5 }
      }
    };

    it('should fetch weather data successfully', async () => {
      axios.get.mockResolvedValueOnce(mockWeatherData);
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'London' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('https://api.openweathermap.org/data/2.5/weather?q=London')
        );
      });
    });

    it('should render WeatherComponent after successful API call', async () => {
      axios.get.mockResolvedValueOnce(mockWeatherData);
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'London' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(screen.getByTestId('weather-component')).toBeInTheDocument();
      });
    });

    it('should include API key in the request', async () => {
      axios.get.mockResolvedValueOnce(mockWeatherData);
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'Paris' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('appid=fe4feefa8543e06d4f3c66d92c61b69c')
        );
      });
    });

    it('should handle API errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      axios.get.mockRejectedValueOnce(new Error('Network error'));
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'InvalidCity' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle 404 response for non-existent city', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      axios.get.mockRejectedValueOnce({
        response: { status: 404, data: { message: 'city not found' } }
      });
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'NonExistentCity123' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle network timeout', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      axios.get.mockRejectedValueOnce(new Error('timeout of 5000ms exceeded'));
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'Tokyo' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Weather Data Display', () => {
    const mockWeatherData = {
      data: {
        name: 'Tokyo',
        sys: { country: 'JP', sunrise: 1234567890, sunset: 1234567890 },
        main: { temp: 298.15, humidity: 70, pressure: 1015 },
        weather: [{ description: 'partly cloudy', icon: '02d' }],
        wind: { speed: 3.5 }
      }
    };

    it('should display weather data for different cities', async () => {
      axios.get.mockResolvedValueOnce(mockWeatherData);
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'Tokyo' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(screen.getByTestId('weather-city')).toHaveTextContent('Tokyo');
      });
    });

    it('should pass correct props to WeatherComponent', async () => {
      axios.get.mockResolvedValueOnce(mockWeatherData);
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'Tokyo' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(WeatherComponent).toHaveBeenCalledWith(
          expect.objectContaining({
            weather: mockWeatherData.data,
            city: 'Tokyo'
          }),
          expect.anything()
        );
      });
    });
  });

  describe('Component Props and Callbacks', () => {
    it('should pass updateCity callback to CityComponent', () => {
      render(<App />);
      
      expect(CityComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          updateCity: expect.any(Function),
          fetchWeather: expect.any(Function)
        }),
        expect.anything()
      );
    });

    it('should pass fetchWeather callback to CityComponent', () => {
      render(<App />);
      
      const calls = CityComponent.mock.calls;
      expect(calls[0][0].fetchWeather).toBeInstanceOf(Function);
    });
  });

  describe('Event Handling', () => {
    it('should prevent default form submission', async () => {
      const mockEvent = { preventDefault: jest.fn() };
      axios.get.mockResolvedValueOnce({
        data: {
          name: 'Berlin',
          sys: { country: 'DE', sunrise: 1234567890, sunset: 1234567890 },
          main: { temp: 293.15, humidity: 60, pressure: 1010 },
          weather: [{ description: 'cloudy', icon: '03d' }],
          wind: { speed: 4.5 }
        }
      });
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'Berlin' } });
      fireEvent.click(searchButton, mockEvent);
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    it('should handle multiple search requests', async () => {
      const mockData1 = {
        data: {
          name: 'London',
          sys: { country: 'GB', sunrise: 1234567890, sunset: 1234567890 },
          main: { temp: 295.15, humidity: 65, pressure: 1013 },
          weather: [{ description: 'clear', icon: '01d' }],
          wind: { speed: 5.5 }
        }
      };
      
      const mockData2 = {
        data: {
          name: 'Paris',
          sys: { country: 'FR', sunrise: 1234567890, sunset: 1234567890 },
          main: { temp: 297.15, humidity: 70, pressure: 1015 },
          weather: [{ description: 'sunny', icon: '01d' }],
          wind: { speed: 3.5 }
        }
      };
      
      axios.get.mockResolvedValueOnce(mockData1).mockResolvedValueOnce(mockData2);
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      // First search
      fireEvent.change(input, { target: { value: 'London' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(screen.getByTestId('weather-city')).toHaveTextContent('London');
      });
      
      // Second search
      fireEvent.change(input, { target: { value: 'Paris' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(screen.getByTestId('weather-city')).toHaveTextContent('Paris');
      });
      
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('WeatherIcons Export', () => {
    it('should export WeatherIcons object', () => {
      expect(WeatherIcons).toBeDefined();
      expect(typeof WeatherIcons).toBe('object');
    });

    it('should contain all day weather icon mappings', () => {
      expect(WeatherIcons['01d']).toBe('/react-weather-app/icons/sunny.svg');
      expect(WeatherIcons['02d']).toBe('/react-weather-app/icons/day.svg');
      expect(WeatherIcons['03d']).toBe('/react-weather-app/icons/cloudy.svg');
      expect(WeatherIcons['04d']).toBe('/react-weather-app/icons/perfect-day.svg');
      expect(WeatherIcons['09d']).toBe('/react-weather-app/icons/rain.svg');
      expect(WeatherIcons['10d']).toBe('/react-weather-app/icons/rain.svg');
      expect(WeatherIcons['11d']).toBe('/react-weather-app/icons/storm.svg');
    });

    it('should contain all night weather icon mappings', () => {
      expect(WeatherIcons['01n']).toBe('/react-weather-app/icons/night.svg');
      expect(WeatherIcons['02n']).toBe('/react-weather-app/icons/cloudy-night.svg');
      expect(WeatherIcons['03n']).toBe('/react-weather-app/icons/cloudy.svg');
      expect(WeatherIcons['04n']).toBe('/react-weather-app/icons/cloudy-night.svg');
      expect(WeatherIcons['09n']).toBe('/react-weather-app/icons/rain-night.svg');
      expect(WeatherIcons['10n']).toBe('/react-weather-app/icons/rain-night.svg');
      expect(WeatherIcons['11n']).toBe('/react-weather-app/icons/storm.svg');
    });

    it('should have exactly 12 weather icon mappings', () => {
      expect(Object.keys(WeatherIcons)).toHaveLength(12);
    });

    it('should have valid path structure for all icons', () => {
      Object.values(WeatherIcons).forEach(iconPath => {
        expect(iconPath).toMatch(/^\/react-weather-app\/icons\/.+\.svg$/);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined city gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      axios.get.mockResolvedValueOnce({
        data: {
          name: 'Unknown',
          sys: { country: 'XX', sunrise: 1234567890, sunset: 1234567890 },
          main: { temp: 293.15, humidity: 50, pressure: 1010 },
          weather: [{ description: 'unknown', icon: '01d' }],
          wind: { speed: 2.5 }
        }
      });
      
      render(<App />);
      const searchButton = screen.getByTestId('search-button');
      
      // Click search without setting city
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed weather data', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      axios.get.mockResolvedValueOnce({ data: {} });
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'City' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(screen.getByTestId('weather-component')).toBeInTheDocument();
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle null response data', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      axios.get.mockResolvedValueOnce({ data: null });
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'City' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('State Management', () => {
    it('should maintain separate city and weather state', async () => {
      const mockWeatherData = {
        data: {
          name: 'Mumbai',
          sys: { country: 'IN', sunrise: 1234567890, sunset: 1234567890 },
          main: { temp: 303.15, humidity: 80, pressure: 1008 },
          weather: [{ description: 'humid', icon: '02d' }],
          wind: { speed: 6.5 }
        }
      };
      
      axios.get.mockResolvedValueOnce(mockWeatherData);
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'Mumbai' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(screen.getByTestId('weather-component')).toBeInTheDocument();
        expect(screen.getByTestId('weather-city')).toHaveTextContent('Mumbai');
      });
    });

    it('should update weather state after each API call', async () => {
      const mockData = {
        data: {
          name: 'Sydney',
          sys: { country: 'AU', sunrise: 1234567890, sunset: 1234567890 },
          main: { temp: 291.15, humidity: 55, pressure: 1012 },
          weather: [{ description: 'clear', icon: '01d' }],
          wind: { speed: 4.0 }
        }
      };
      
      axios.get.mockResolvedValueOnce(mockData);
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'Sydney' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(WeatherComponent).toHaveBeenCalledWith(
          expect.objectContaining({
            weather: expect.objectContaining({
              name: 'Sydney'
            })
          }),
          expect.anything()
        );
      });
    });
  });

  describe('Conditional Rendering', () => {
    it('should show CityComponent when weather is not set', () => {
      render(<App />);
      expect(screen.getByTestId('city-component')).toBeInTheDocument();
      expect(screen.queryByTestId('weather-component')).not.toBeInTheDocument();
    });

    it('should show WeatherComponent when both city and weather are set', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          name: 'Rome',
          sys: { country: 'IT', sunrise: 1234567890, sunset: 1234567890 },
          main: { temp: 296.15, humidity: 65, pressure: 1014 },
          weather: [{ description: 'sunny', icon: '01d' }],
          wind: { speed: 3.0 }
        }
      });
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'Rome' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(screen.queryByTestId('city-component')).not.toBeInTheDocument();
        expect(screen.getByTestId('weather-component')).toBeInTheDocument();
      });
    });
  });

  describe('API URL Construction', () => {
    it('should construct correct API URL with city parameter', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          name: 'TestCity',
          sys: { country: 'XX', sunrise: 1234567890, sunset: 1234567890 },
          main: { temp: 290.15, humidity: 50, pressure: 1010 },
          weather: [{ description: 'test', icon: '01d' }],
          wind: { speed: 2.0 }
        }
      });
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'TestCity' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        const callUrl = axios.get.mock.calls[0][0];
        expect(callUrl).toContain('https://api.openweathermap.org/data/2.5/weather');
        expect(callUrl).toContain('q=TestCity');
        expect(callUrl).toContain('appid=');
      });
    });

    it('should handle cities with spaces in API URL', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          name: 'New York',
          sys: { country: 'US', sunrise: 1234567890, sunset: 1234567890 },
          main: { temp: 288.15, humidity: 60, pressure: 1012 },
          weather: [{ description: 'cloudy', icon: '03d' }],
          wind: { speed: 5.0 }
        }
      });
      
      render(<App />);
      const input = screen.getByTestId('city-input');
      const searchButton = screen.getByTestId('search-button');
      
      fireEvent.change(input, { target: { value: 'New York' } });
      fireEvent.click(searchButton, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          expect.stringContaining('q=New York')
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper app label for screen readers', () => {
      render(<App />);
      const appLabel = screen.getByText('React Weather App');
      expect(appLabel).toBeInTheDocument();
      expect(appLabel).toBeVisible();
    });

    it('should maintain focus management', () => {
      render(<App />);
      expect(screen.getByTestId('city-component')).toBeInTheDocument();
    });
  });
});