from database import test_connection


try:

    result = test_connection()

    print(
        "DATABASE CONNECTION SUCCESSFUL"
    )

    print(
        "Test result:",
        result
    )


except Exception as error:

    print(
        "DATABASE CONNECTION FAILED"
    )

    print(
        error
    )