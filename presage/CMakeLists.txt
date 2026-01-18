cmake_minimum_required(VERSION 3.27.0)
project(SmartSpectraHelloVitals CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(SmartSpectra REQUIRED)
find_package(OpenCV REQUIRED)

# Create executable
add_executable(main main.cpp)

# Link libraries
target_link_libraries(main
    SmartSpectra::Container
    SmartSpectra::Gui
    ${OpenCV_LIBS}
)