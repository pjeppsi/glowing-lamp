using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace FitnessChallenge.Api;

// Bridges FluentValidation into the built-in [ApiController] ModelState
// pipeline so invalid requests get the standard ProblemDetails (RFC 7807)
// 400 response via ControllerBase.ValidationProblem(ModelState).
public static class ValidationResultExtensions
{
    public static void AddToModelState(this ValidationResult result, ModelStateDictionary modelState)
    {
        foreach (var error in result.Errors)
        {
            modelState.AddModelError(error.PropertyName, error.ErrorMessage);
        }
    }
}
