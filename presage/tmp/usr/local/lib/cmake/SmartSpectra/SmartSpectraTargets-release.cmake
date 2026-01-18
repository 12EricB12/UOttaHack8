#----------------------------------------------------------------
# Generated CMake target import file for configuration "Release".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "SmartSpectra::VideoInterface" for configuration "Release"
set_property(TARGET SmartSpectra::VideoInterface APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SmartSpectra::VideoInterface PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libSmartSpectraVideoInterface.a"
  )

list(APPEND _cmake_import_check_targets SmartSpectra::VideoInterface )
list(APPEND _cmake_import_check_files_for_SmartSpectra::VideoInterface "${_IMPORT_PREFIX}/lib/libSmartSpectraVideoInterface.a" )

# Import target "SmartSpectra::VideoSource_Camera" for configuration "Release"
set_property(TARGET SmartSpectra::VideoSource_Camera APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SmartSpectra::VideoSource_Camera PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libSmartSpectraVideoSource_Camera.a"
  )

list(APPEND _cmake_import_check_targets SmartSpectra::VideoSource_Camera )
list(APPEND _cmake_import_check_files_for_SmartSpectra::VideoSource_Camera "${_IMPORT_PREFIX}/lib/libSmartSpectraVideoSource_Camera.a" )

# Import target "SmartSpectra::VideoSource_FileStream" for configuration "Release"
set_property(TARGET SmartSpectra::VideoSource_FileStream APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SmartSpectra::VideoSource_FileStream PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libSmartSpectraVideoSource_FileStream.a"
  )

list(APPEND _cmake_import_check_targets SmartSpectra::VideoSource_FileStream )
list(APPEND _cmake_import_check_files_for_SmartSpectra::VideoSource_FileStream "${_IMPORT_PREFIX}/lib/libSmartSpectraVideoSource_FileStream.a" )

# Import target "SmartSpectra::VideoSource" for configuration "Release"
set_property(TARGET SmartSpectra::VideoSource APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SmartSpectra::VideoSource PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libSmartSpectraVideoSource.a"
  )

list(APPEND _cmake_import_check_targets SmartSpectra::VideoSource )
list(APPEND _cmake_import_check_files_for_SmartSpectra::VideoSource "${_IMPORT_PREFIX}/lib/libSmartSpectraVideoSource.a" )

# Import target "SmartSpectra::Container" for configuration "Release"
set_property(TARGET SmartSpectra::Container APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SmartSpectra::Container PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libSmartSpectraContainer.a"
  )

list(APPEND _cmake_import_check_targets SmartSpectra::Container )
list(APPEND _cmake_import_check_files_for_SmartSpectra::Container "${_IMPORT_PREFIX}/lib/libSmartSpectraContainer.a" )

# Import target "SmartSpectra::Gui" for configuration "Release"
set_property(TARGET SmartSpectra::Gui APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SmartSpectra::Gui PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/libSmartSpectraGui.a"
  )

list(APPEND _cmake_import_check_targets SmartSpectra::Gui )
list(APPEND _cmake_import_check_files_for_SmartSpectra::Gui "${_IMPORT_PREFIX}/lib/libSmartSpectraGui.a" )

# Import target "SmartSpectra::dense_facemesh" for configuration "Release"
set_property(TARGET SmartSpectra::dense_facemesh APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SmartSpectra::dense_facemesh PROPERTIES
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/bin/dense_facemesh"
  )

list(APPEND _cmake_import_check_targets SmartSpectra::dense_facemesh )
list(APPEND _cmake_import_check_files_for_SmartSpectra::dense_facemesh "${_IMPORT_PREFIX}/bin/dense_facemesh" )

# Import target "SmartSpectra::minimal_rest_spot_example" for configuration "Release"
set_property(TARGET SmartSpectra::minimal_rest_spot_example APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SmartSpectra::minimal_rest_spot_example PROPERTIES
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/bin/minimal_rest_spot_example"
  )

list(APPEND _cmake_import_check_targets SmartSpectra::minimal_rest_spot_example )
list(APPEND _cmake_import_check_files_for_SmartSpectra::minimal_rest_spot_example "${_IMPORT_PREFIX}/bin/minimal_rest_spot_example" )

# Import target "SmartSpectra::rest_spot_example" for configuration "Release"
set_property(TARGET SmartSpectra::rest_spot_example APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SmartSpectra::rest_spot_example PROPERTIES
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/bin/rest_spot_example"
  )

list(APPEND _cmake_import_check_targets SmartSpectra::rest_spot_example )
list(APPEND _cmake_import_check_files_for_SmartSpectra::rest_spot_example "${_IMPORT_PREFIX}/bin/rest_spot_example" )

# Import target "SmartSpectra::rest_continuous_example" for configuration "Release"
set_property(TARGET SmartSpectra::rest_continuous_example APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(SmartSpectra::rest_continuous_example PROPERTIES
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/bin/rest_continuous_example"
  )

list(APPEND _cmake_import_check_targets SmartSpectra::rest_continuous_example )
list(APPEND _cmake_import_check_files_for_SmartSpectra::rest_continuous_example "${_IMPORT_PREFIX}/bin/rest_continuous_example" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)
