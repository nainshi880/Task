import customerService from "../services/customer.service.js";
import ApiError from "../utils/ApiError.js";
import cloudinary from "../config/cloudinary.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

// ======================================
// Create Customer Profile
// ======================================

export const createProfile = asyncHandler(async (req, res) => {

  const profile = await customerService.createProfile(
    req.user._id,
    req.body
  );

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Customer profile created successfully.",
      profile
    )
  );

});

// ======================================
// Get Customer Profile
// ======================================

export const getProfile = asyncHandler(async (req, res) => {

  const profile = await customerService.getProfile(
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Customer profile fetched successfully.",
      profile
    )
  );

});

// ======================================
// Update Customer Profile
// ======================================

export const updateProfile = asyncHandler(async (req, res) => {

  const profile = await customerService.updateProfile(
    req.user._id,
    req.body
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Customer profile updated successfully.",
      profile
    )
  );

});

// ======================================
// Delete Customer Profile
// ======================================

export const deleteProfile = asyncHandler(async (req, res) => {

  const result = await customerService.deleteProfile(
    req.user._id
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      result.message
    )
  );

});


// ======================================
// Add Address
// ======================================

export const addAddress=
asyncHandler(async(req,res)=>{

const profile=
await customerService.addAddress(

req.user._id,

req.body

);

res.status(201).json(

new ApiResponse(

201,

"Address added successfully.",

profile

)

);

});

// ======================================
// Get Addresses
// ======================================

export const getAddresses =
asyncHandler(async (req, res) => {

  const addresses =
    await customerService.getAddresses(
      req.user._id
    );

  res.status(200).json(
    new ApiResponse(
      200,
      "Addresses fetched successfully.",
      addresses
    )
  );

});

// ======================================
// Update Address
// ======================================

export const updateAddress=
asyncHandler(async(req,res)=>{

const profile=
await customerService.updateAddress(

req.user._id,

req.params.addressId,

req.body

);

res.status(200).json(

new ApiResponse(

200,

"Address updated successfully.",

profile

)

);

});

// ======================================
// Delete Address
// ======================================

export const deleteAddress=
asyncHandler(async(req,res)=>{

const profile=
await customerService.deleteAddress(

req.user._id,

req.params.addressId

);

res.status(200).json(

new ApiResponse(

200,

"Address deleted successfully.",

profile

)

);

});

// ======================================
// Upload Avatar
// ======================================

export const uploadAvatar=
asyncHandler(async(req,res)=>{

if(!req.file){

throw new ApiError(

400,

"Please upload an image."

);

}

const result=

await cloudinary.uploader.upload(

req.file.path,

{

folder:"customer-avatars"

}

);

const profile=

await customerService.updateAvatar(

req.user._id,

result.secure_url

);

res.status(200).json(

new ApiResponse(

200,

"Avatar uploaded successfully.",

profile

)

);

});
// ======================================
// Delete Avatar
// ======================================

export const deleteAvatar=
asyncHandler(async(req,res)=>{

const profile=

await customerService.deleteAvatar(

req.user._id

);

res.status(200).json(

new ApiResponse(

200,

"Avatar deleted successfully.",

profile

)

);

});

// =====================================================
// Customer Dashboard
// =====================================================

export const getDashboard = asyncHandler(async (req, res) => {

  const dashboard =
    await customerService.getDashboard(req.user._id);

  res.status(HTTP_STATUS.OK).json(

    new ApiResponse(

      HTTP_STATUS.OK,

      "Dashboard fetched successfully.",

      dashboard

    )

  );

});

// =====================================================
// Booking Statistics
// =====================================================

export const getStatistics = asyncHandler(async (req, res) => {

  const statistics =
    await customerService.getStatistics(req.user._id);

  res.status(HTTP_STATUS.OK).json(

    new ApiResponse(

      HTTP_STATUS.OK,

      "Statistics fetched successfully.",

      statistics

    )

  );

});

// =====================================================
// Recent Bookings
// =====================================================

export const getRecentBookings = asyncHandler(async (req, res) => {

  const bookings =
    await customerService.getRecentBookings(req.user._id);

  res.status(HTTP_STATUS.OK).json(

    new ApiResponse(

      HTTP_STATUS.OK,

      "Recent bookings fetched successfully.",

      bookings

    )

  );

});

// =====================================================
// Upcoming Bookings
// =====================================================

export const getUpcomingBookings = asyncHandler(async (req, res) => {

  const bookings =
    await customerService.getUpcomingBookings(req.user._id);

  res.status(HTTP_STATUS.OK).json(

    new ApiResponse(

      HTTP_STATUS.OK,

      "Upcoming bookings fetched successfully.",

      bookings

    )

  );

});

// =====================================================
// Notifications
// =====================================================

export const getNotifications = asyncHandler(async (req, res) => {

  const notifications =
    await customerService.getNotifications(req.user._id);

  res.status(HTTP_STATUS.OK).json(

    new ApiResponse(

      HTTP_STATUS.OK,

      "Notifications fetched successfully.",

      notifications

    )

  );

});

// =====================================================
// Change Password
// =====================================================

export const changePassword = asyncHandler(async (req, res) => {

    const result = await customerService.changePassword(

        req.user._id,

        req.body

    );

    res.status(HTTP_STATUS.OK).json(

        new ApiResponse(

            HTTP_STATUS.OK,

            result.message

        )

    );

});

// =====================================================
// Deactivate Account
// =====================================================

export const deactivateAccount = asyncHandler(async (req, res) => {

    const result = await customerService.deactivateAccount(

        req.user._id

    );

    res.status(HTTP_STATUS.OK).json(

        new ApiResponse(

            HTTP_STATUS.OK,

            result.message

        )

    );

});

// =====================================================
// Delete Account
// =====================================================

export const deleteAccount = asyncHandler(async (req, res) => {

    const result = await customerService.deleteAccount(

        req.user._id

    );

    res.status(HTTP_STATUS.OK).json(

        new ApiResponse(

            HTTP_STATUS.OK,

            result.message

        )

    );

});

// =====================================================
// Logout From All Devices
// =====================================================

export const logoutAllDevices = asyncHandler(async (req, res) => {

    const result = await customerService.logoutAllDevices(

        req.user._id

    );

    res.status(HTTP_STATUS.OK).json(

        new ApiResponse(

            HTTP_STATUS.OK,

            result.message

        )

    );

});

// =====================================================
// Update Preferences
// =====================================================

export const updatePreferences = asyncHandler(async (req, res) => {

    const preferences =

        await customerService.updatePreferences(

            req.user._id,

            req.body

        );

    res.status(HTTP_STATUS.OK).json(

        new ApiResponse(

            HTTP_STATUS.OK,

            "Preferences updated successfully.",

            preferences

        )

    );

});


// =====================================================
// Get Preferences
// =====================================================

export const getPreferences = asyncHandler(async (req, res) => {

    const preferences =

        await customerService.getPreferences(

            req.user._id

        );

    res.status(HTTP_STATUS.OK).json(

        new ApiResponse(

            HTTP_STATUS.OK,

            "Preferences fetched successfully.",

            preferences

        )

    );

});

// =====================================================
// Update Privacy
// =====================================================

export const updatePrivacy = asyncHandler(async (req, res) => {

    const privacy =

        await customerService.updatePrivacy(

            req.user._id,

            req.body

        );

    res.status(HTTP_STATUS.OK).json(

        new ApiResponse(

            HTTP_STATUS.OK,

            "Privacy settings updated successfully.",

            privacy

        )

    );

});

// =====================================================
// Get Privacy
// =====================================================

export const getPrivacy = asyncHandler(async (req, res) => {

    const privacy =

        await customerService.getPrivacy(

            req.user._id

        );

    res.status(HTTP_STATUS.OK).json(

        new ApiResponse(

            HTTP_STATUS.OK,

            "Privacy settings fetched successfully.",

            privacy

        )

    );

});
// =====================================================
// Admin: Search / Filter / Pagination
// =====================================================

const getActorMeta = (req) => ({
  userId: req.user._id,
  ipAddress: req.ip,
  userAgent: req.get("user-agent"),
});

export const searchCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.searchCustomers(
    req.query,
    getActorMeta(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Customers searched successfully.",
      result
    )
  );
});

export const filterCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.filterCustomers(
    req.query,
    getActorMeta(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Customers filtered successfully.",
      result
    )
  );
});

export const listCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(
    req.query,
    getActorMeta(req)
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Customers fetched successfully.",
      result
    )
  );
});
