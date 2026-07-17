import serviceCatalogService from "../services/serviceCatalog.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import HTTP_STATUS from "../constants/httpStatus.js";

export const listServices = asyncHandler(async (req, res) => {
  const result = await serviceCatalogService.listServices(req.query);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Services fetched successfully.", result)
  );
});

export const getPopularServices = asyncHandler(async (req, res) => {
  const result = await serviceCatalogService.getPopularServices(
    req.query.limit
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Popular services fetched successfully.",
      result
    )
  );
});

export const getServiceCategories = asyncHandler(async (_req, res) => {
  const result = await serviceCatalogService.getCategories();

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Service categories fetched successfully.",
      result
    )
  );
});

export const getServiceById = asyncHandler(async (req, res) => {
  const result = await serviceCatalogService.getServiceById(
    req.params.serviceId
  );

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Service details fetched successfully.", result)
  );
});
